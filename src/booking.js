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
  if (!bookingCode || !roomNo) throw new Error('Missing booking or room');
  const found = await client.from('bookings').select('id, data').eq('data->>code', bookingCode).single();
  if (found.error) throw found.error;
  if (!found.data || found.data.data.status === 'cancelled') throw new Error('Booking unavailable');
  const record = found.data.data;
  const saved = await client.from('bookings').update({ data: {
    ...record, ...summary, checkoutAt: record.checkoutAt || new Date().toISOString(),
  } }).eq('id', found.data.id).eq('data', JSON.stringify(record)).select('id');
  if (saved.error) throw saved.error;
  if (saved.data?.length !== 1) throw new Error('Booking changed; retry');
  // Only change room status after the summary is committed for the email trigger.
  for (let attempt = 0; attempt < 3; attempt++) {
    const board = await client.from('rooms').select('data').eq('id', 'default').single();
    if (board.error) throw board.error;
    if (!Array.isArray(board.data?.data)) throw new Error('Room board unavailable');
    const rooms = board.data.data;
    const target = rooms.find(r => r.number === roomNo && r.code === bookingCode);
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
