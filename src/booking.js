export async function checkAvailability(client, checkIn, checkOut) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(checkOut || '') || checkOut <= checkIn) {
    throw new Error('Invalid stay dates');
  }
  const { data, error } = await client.rpc('check_room_availability', {
    p_check_in: checkIn, p_check_out: checkOut,
  });
  if (error) throw error;
  const result = data?.[0];
  if (typeof result?.available !== 'boolean' || !Number.isInteger(result.remaining) || result.remaining < 0) {
    throw new Error('Availability could not be verified');
  }
  return { ...result, available: result.available && result.remaining > 0 };
}

// Keep the same record id on retries. Never replace the bookings collection.
export async function saveBooking(client, record) {
  const prior = await client.from('bookings').select('id, data').eq('id', record.id).maybeSingle();
  if (prior.error) throw prior.error;
  if (prior.data) {
    if (prior.data.data?.code !== record.code) throw new Error('Booking id conflict');
    return;
  }
  const { error } = await client.from('bookings').insert({ id: record.id, data: record });
  if (!error) return;
  if (error.code === '23505') {
    const existing = await client.from('bookings').select('id, data').eq('id', record.id).single();
    if (!existing.error && existing.data?.data?.code === record.code) return;
  }
  throw error;
}

export async function assignBookingRoom(client, record, extraBed) {
  // Compare-and-swap prevents two clients replacing the same room-board snapshot.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client.from('rooms').select('data').eq('id', 'default').single();
    if (error) throw error;
    if (!Array.isArray(data?.data)) throw new Error('Room board unavailable');
    const rooms = data.data;
    const existing = rooms.find(room => room.code === record.code);
    if (existing) return existing.number;
    const target = rooms.find(room => room.status === 'ready' && !room.code && (!extraBed || !room.noExtraBed));
    // A future reservation can be saved even while today's room board is occupied.
    // Leave assignment to staff instead of overwriting another guest's room.
    if (!target) return null;
    const updated = rooms.map(room => room.number === target.number ? {
      ...room, status: 'pending', guestName: record.name, phone: record.phone,
      checkIn: record.checkIn, checkOut: record.checkOut,
      checkInISO: record.checkInISO, checkOutISO: record.checkOutISO,
      code: record.code, hasExtraBed: !!extraBed,
    } : room);
    const result = await client.from('rooms')
      .update({ data: updated, updated_at: new Date().toISOString() })
      .eq('id', 'default').eq('data', JSON.stringify(rooms)).select('id');
    if (result.error) throw result.error;
    if (result.data?.length === 1) return target.number;
  }
  throw new Error('Room board changed; assignment pending');
}

export async function confirmBooking(client, record, extraBed) {
  await saveBooking(client, record);
  try {
    return { roomNo: await assignBookingRoom(client, record, extraBed) };
  } catch {
    // The reservation is durable. Do not invite another payment or insert.
    return { roomNo: null };
  }
}

export async function cancelBooking(client, id) {
  const current = await client.from('bookings').select('data').eq('id', id).single();
  if (current.error) throw current.error;
  const record = current.data?.data;
  if (!record) throw new Error('Booking not found');
  if (record.status !== 'cancelled') {
    const result = await client.from('bookings')
      .update({ data: { ...record, status: 'cancelled', cancelledAt: new Date().toISOString() } })
      .eq('id', id).eq('data', JSON.stringify(record)).select('id');
    if (result.error) throw result.error;
    if (result.data?.length !== 1) throw new Error('Booking changed; refresh and retry');
  }
  // Free only this reservation's assignment; never overwrite a newer room board.
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await client.from('rooms').select('data').eq('id', 'default').single();
      if (result.error || !Array.isArray(result.data?.data)) throw new Error('Room board unavailable');
      const rooms = result.data.data;
      if (!rooms.some(r => r.code === record.code)) return true;
      const updated = rooms.map(r => r.code === record.code ? {
        ...r, status: r.status === 'pending' ? 'ready' : 'cleaning',
        code: '', guestName: '', phone: '', checkIn: '', checkOut: '', checkInISO: '', checkOutISO: '', hasExtraBed: false,
      } : r);
      const saved = await client.from('rooms').update({ data: updated, updated_at: new Date().toISOString() })
        .eq('id', 'default').eq('data', JSON.stringify(rooms)).select('id');
      if (saved.error) throw saved.error;
      if (saved.data?.length === 1) return true;
    }
  } catch { /* Cancellation is saved; allow staff to retry room cleanup. */ }
  return false;
}

export async function completeCheckout(client, bookingCode, roomNo, summary) {
  if (!bookingCode) throw new Error('Missing booking or room');
  const found = await client.from('bookings').select('id, data').eq('data->>code', bookingCode).single();
  if (found.error) throw found.error;
  if (!found.data || found.data.data.status === 'cancelled') throw new Error('Booking unavailable');
  // Never put the full booking (including base64 slips) into a URL filter.
  // Merge only checkout fields in PostgreSQL, preserving concurrent edits.
  const saved = await client.rpc('save_checkout_summary', {
    p_booking_id: found.data.id, p_booking_code: bookingCode, p_summary: summary,
  });
  if (saved.error) throw saved.error;
  if (saved.data !== true) throw new Error('Booking changed; retry');
  // Only change room status after the summary is committed for the email trigger.
  for (let attempt = 0; attempt < 3; attempt++) {
    const board = await client.from('rooms').select('data').eq('id', 'default').single();
    if (board.error) throw board.error;
    if (!Array.isArray(board.data?.data)) throw new Error('Room board unavailable');
    const rooms = board.data.data;
    const assigned = rooms.filter(r => r.code === bookingCode);
    const target = assigned.length === 1 ? assigned[0] : assigned.find(r => r.number === roomNo);
    if (!target) throw new Error('Room assignment changed; contact staff');
    if (target.status === 'checkout') return;
    if (target.status !== 'occupied') throw new Error('Room is not checked in');
    // Retain the booking code until staff clear the room so notifications and
    // retries can still identify this reservation.
    const updated = rooms.map(r => r === target ? { ...r, status: 'checkout' } : r);
    const result = await client.from('rooms').update({ data: updated, updated_at: new Date().toISOString() })
      .eq('id', 'default').eq('data', JSON.stringify(rooms)).select('id');
    if (result.error) throw result.error;
    if (result.data?.length === 1) return;
  }
  throw new Error('Room board changed; retry');
}

export function checkoutPaymentState(amountDue, slipAttached, verifying = false) {
  const valid = Number.isFinite(amountDue) && amountDue >= 0;
  const requiresPayment = valid && amountDue > 0;
  return {
    checkoutPaid: valid && (!requiresPayment || !!slipAttached),
    canConfirm: valid && (!requiresPayment || (!!slipAttached && !verifying)),
  };
}

export const normalizedRoomStatus = room => String(room?.status || '').trim().toLowerCase();
export const canSelectRoom = (room, code, extraBed = false) => {
  const own = !!code && room.code === code;
  return (own ? ['pending', 'occupied'].includes(normalizedRoomStatus(room)) : normalizedRoomStatus(room) === 'ready' && !room.code)
    && (!extraBed || !room.noExtraBed);
};
export async function assignSelectedRoom(client, booking, number) {
  const found = await client.from('bookings').select('id, data').eq('id', booking.id).single();
  if (found.error) throw found.error;
  const record = found.data?.data;
  if (!record || record.status === 'cancelled') throw new Error('Booking unavailable');
  for (let attempt = 0; attempt < 3; attempt++) {
    const board = await client.from('rooms').select('data').eq('id', 'default').single();
    if (board.error) throw board.error;
    const rooms = board.data?.data;
    if (!Array.isArray(rooms)) throw new Error('Room board unavailable');
    const current = rooms.find(r => r.code === record.code);
    const extraBed = !!(record.extraBed || current?.hasExtraBed);
    const target = rooms.find(r => r.number === number);
    if (!target || !canSelectRoom(target, record.code, extraBed)) throw new Error('Selected room is unavailable');
    if (current === target) return;
    const updated = rooms.map(r => r === target ? {
      ...r, status: current && normalizedRoomStatus(current) === 'occupied' ? 'occupied' : 'pending',
      guestName: record.name, phone: record.phone, code: record.code,
      checkIn: record.checkIn, checkOut: record.checkOut, checkInISO: record.checkInISO, checkOutISO: record.checkOutISO, hasExtraBed: extraBed,
    } : r === current ? {
      ...r, status: normalizedRoomStatus(current) === 'occupied' ? 'cleaning' : 'ready',
      guestName: '', phone: '', code: '', checkIn: '', checkOut: '', checkInISO: '', checkOutISO: '', hasExtraBed: false,
    } : r);
    const saved = await client.from('rooms').update({ data: updated, updated_at: new Date().toISOString() })
      .eq('id', 'default').eq('data', JSON.stringify(rooms)).select('id');
    if (saved.error) throw saved.error;
    if (saved.data?.length === 1) return;
  }
  throw new Error('Rooms changed; retry');
}
