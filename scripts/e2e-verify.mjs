const BASE = "http://localhost:3000";

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function req(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  const nextCookie = setCookie ? setCookie.split(";")[0] : cookie;
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, cookie: nextCookie };
}

async function run() {
  const ts = Date.now();
  const driverEmail = `e2e_driver_${ts}@along.eg`;
  const pass1Email = `e2e_p1_${ts}@along.eg`;
  const pass2Email = `e2e_p2_${ts}@along.eg`;

  console.log("1. Registering Driver, Passenger 1, Passenger 2...");
  const dReg = await req("/api/auth/register", {
    method: "POST",
    body: {
      name: "E2E Driver",
      email: driverEmail,
      password: "Password123!",
      phone: "+201099990001",
    },
  });
  assert(dReg.status === 201 && dReg.cookie, "Driver register failed");

  const p1Reg = await req("/api/auth/register", {
    method: "POST",
    body: {
      name: "E2E Passenger One",
      email: pass1Email,
      password: "Password123!",
      phone: "+201099990002",
    },
  });
  assert(p1Reg.status === 201 && p1Reg.cookie, "Passenger 1 register failed");

  const p2Reg = await req("/api/auth/register", {
    method: "POST",
    body: {
      name: "E2E Passenger Two",
      email: pass2Email,
      password: "Password123!",
      phone: "+201099990003",
    },
  });
  assert(p2Reg.status === 201 && p2Reg.cookie, "Passenger 2 register failed");

  console.log("2. Driver registers vehicle...");
  const vRes = await req("/api/vehicles", {
    method: "POST",
    cookie: dReg.cookie,
    body: {
      make: "Toyota",
      model: "Corolla",
      year: 2024,
      color: "White",
      plateNumber: `E2E-${ts}`,
      maxPassengerSeats: 4,
      trunkDescription: "Large sedan trunk",
      maxLuggageUnits: 5,
    },
  });
  assert(vRes.status === 201 && vRes.data.vehicle?.id, "Vehicle create failed");

  console.log("3. Driver publishes 1-seat Instant Ride in Zagazig (H3)...");
  const futureDate = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  const rRes = await req("/api/rides", {
    method: "POST",
    cookie: dReg.cookie,
    body: {
      vehicleId: vRes.data.vehicle.id,
      originName: "Zagazig E2E Point",
      originLat: 30.5877,
      originLng: 31.502,
      destName: "Cairo E2E Dest",
      destLat: 30.0626,
      destLng: 31.2469,
      departureTime: futureDate,
      totalSeats: 1,
      price: 110,
      instantBooking: true,
      liveLocationSharingEnabled: true,
      maxLuggageUnits: 5,
      amenities: ["AC", "Instant booking"],
    },
  });
  assert(rRes.status === 201 && rRes.data.ride?.originH3Index, "Ride publish failed");
  const rideId = rRes.data.ride.id;

  console.log("4. Searching nearby via Uber H3 & OSRM /api/route...");
  const nearby = await req("/api/rides/nearby?lat=30.5877&lng=31.502&k=1&includeFull=true");
  assert(
    nearby.status === 200 && nearby.data.rides.some((r) => r.id === rideId),
    "Published ride not found via H3 nearby search"
  );
  const routeRes = await req(
    "/api/route?originLat=30.5877&originLng=31.502&destLat=30.0626&destLng=31.2469"
  );
  assert(
    routeRes.status === 200 && routeRes.data.coordinates.length >= 2,
    "/api/route failed"
  );

  console.log("5. Smart Luggage Fit Check & Instant Booking by Passenger 1...");
  const fitRes = await req(`/api/rides/${rideId}/luggage-check`, {
    method: "POST",
    body: { luggageSize: "LARGE", seatsRequested: 1 }, // 3/5 = 60% -> FITS_COMFORTABLY
  });
  assert(
    fitRes.status === 200 && fitRes.data.fit.status === "FITS_COMFORTABLY",
    "Luggage fit check failed"
  );

  const b1 = await req("/api/bookings", {
    method: "POST",
    cookie: p1Reg.cookie,
    body: { rideId, seatsRequested: 1, luggageSize: "MEDIUM" },
  });
  assert(
    b1.status === 201 &&
      b1.data.booking.status === "CONFIRMED" &&
      b1.data.booking.paymentStatus === "SIMULATED_PAID",
    "Instant booking failed"
  );
  const booking1Id = b1.data.booking.id;

  console.log("6. Passenger 2 joins Standby Queue on full ride...");
  const sb = await req("/api/standby", {
    method: "POST",
    cookie: p2Reg.cookie,
    body: { rideId, seatsRequested: 1, luggageSize: "SMALL" },
  });
  assert(
    sb.status === 201 && sb.data.standby.status === "WAITING",
    "Standby join failed"
  );
  const standbyId = sb.data.standby.id;

  console.log("7. Real 1-to-1 Trip Chat between Passenger 1 & Driver...");
  const chatOpen = await req("/api/chats", {
    method: "POST",
    cookie: p1Reg.cookie,
    body: { rideId },
  });
  assert(chatOpen.status === 201 && chatOpen.data.room?.id, "Chat open failed");
  const roomId = chatOpen.data.room.id;

  const pMsg = await req(`/api/chats/${roomId}/messages`, {
    method: "POST",
    cookie: p1Reg.cookie,
    body: { body: "Hello Driver from E2E!" },
  });
  assert(pMsg.status === 201, "Passenger send message failed");

  const dRead = await req(`/api/chats/${roomId}/messages`, {
    cookie: dReg.cookie,
  });
  assert(
    dRead.status === 200 &&
      dRead.data.messages.some((m) => m.body === "Hello Driver from E2E!"),
    "Driver did not see passenger chat message"
  );

  const dReply = await req(`/api/chats/${roomId}/messages`, {
    method: "POST",
    cookie: dReg.cookie,
    body: { body: "See you at the gate!" },
  });
  assert(dReply.status === 201, "Driver reply failed");

  console.log("8. Passenger 1 cancels -> Standby auto-promoted -> Passenger 2 accepts...");
  const cancelRes = await req(`/api/bookings/${booking1Id}`, {
    method: "PATCH",
    cookie: p1Reg.cookie,
    body: { status: "CANCELLED" },
  });
  assert(
    cancelRes.status === 200 &&
      cancelRes.data.booking.paymentStatus === "REFUNDED" &&
      cancelRes.data.promotedStandby?.id === standbyId &&
      cancelRes.data.promotedStandby?.status === "OFFERED",
    "Cancel did not promote standby to OFFERED"
  );

  const acceptSb = await req(`/api/standby/${standbyId}`, {
    method: "PATCH",
    cookie: p2Reg.cookie,
    body: { action: "ACCEPT" },
  });
  assert(
    acceptSb.status === 200 &&
      acceptSb.data.booking.status === "CONFIRMED" &&
      acceptSb.data.standby.status === "PROMOTED",
    "Accept standby offer failed"
  );

  console.log("9. Driver completes ride -> Passenger 2 submits review...");
  const completeRes = await req(`/api/rides/${rideId}`, {
    method: "PATCH",
    cookie: dReg.cookie,
    body: { status: "COMPLETED" },
  });
  assert(completeRes.status === 200 && completeRes.data.ride.status === "COMPLETED", "Complete ride failed");

  const revRes = await req("/api/reviews", {
    method: "POST",
    cookie: p2Reg.cookie,
    body: {
      rideId,
      rating: 5,
      tags: ["Punctual", "Safe Driving"],
      comment: "Excellent E2E trip!",
    },
  });
  assert(revRes.status === 201 && revRes.data.review.rating === 5, "Review submit failed");

  const dProfile = await req("/api/auth/me", { cookie: dReg.cookie });
  assert(
    dProfile.status === 200 &&
      dProfile.data.user.stats.averageRating === 5 &&
      dProfile.data.user.aiOverview.includes("5.0★"),
    "Driver profile rating / AI Overview did not update"
  );

  console.log("10. Passenger 2 submits KYC -> Admin approves KYC & tests Ban enforcement...");
  const kycRes = await req("/api/profile/kyc", {
    method: "POST",
    cookie: p2Reg.cookie,
    body: { kycIdNumber: "29901010101234", kycNote: "E2E KYC test" },
  });
  assert(kycRes.status === 200 && kycRes.data.user.kycStatus === "PENDING", "KYC submit failed");

  const adminLogin = await req("/api/auth/login", {
    method: "POST",
    body: { email: "admin@along.eg", password: "Password123!" },
  });
  assert(adminLogin.status === 200 && adminLogin.cookie, "Admin login failed");

  const approveKyc = await req(`/api/admin/users/${p2Reg.data.user.id}`, {
    method: "PATCH",
    cookie: adminLogin.cookie,
    body: { kycStatus: "VERIFIED" },
  });
  assert(approveKyc.status === 200 && approveKyc.data.user.kycStatus === "VERIFIED", "Admin KYC approve failed");

  const banP1 = await req(`/api/admin/users/${p1Reg.data.user.id}`, {
    method: "PATCH",
    cookie: adminLogin.cookie,
    body: { toggleBan: true },
  });
  assert(banP1.status === 200 && banP1.data.user.isBanned === true, "Admin ban failed");

  // Verify banned user is blocked from protected endpoints immediately
  const bannedAction = await req("/api/auth/me", { cookie: p1Reg.cookie });
  assert(bannedAction.status === 401, "Banned user was not blocked on /api/auth/me");

  // Cleanup test ride
  await req(`/api/admin/rides/${rideId}`, {
    method: "DELETE",
    cookie: adminLogin.cookie,
  });

  console.log("ALL 10 END-TO-END FLOWS PASSED AGAINST POSTGRESQL!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
