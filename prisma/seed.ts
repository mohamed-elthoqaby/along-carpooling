import {
  BookingStatus,
  KycStatus,
  LuggageSize,
  PaymentStatus,
  PrismaClient,
  RideStatus,
  Role,
  StandbyStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { getH3Index } from "../src/lib/h3";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Along database...");

  // Clear existing data in dependency order
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.review.deleteMany();
  await prisma.standbyRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1 Admin
  const admin = await prisma.user.create({
    data: {
      name: "Along Admin",
      email: "admin@along.eg",
      passwordHash,
      phone: "+201000000001",
      bio: "Platform administrator & safety reviewer.",
      role: Role.ADMIN,
      kycStatus: KycStatus.VERIFIED,
    },
  });

  // 2 Verified Drivers (Unified USER role with Vehicles)
  const ahmed = await prisma.user.create({
    data: {
      name: "Ahmed Hassan",
      email: "ahmed@along.eg",
      passwordHash,
      phone: "+201011112222",
      bio: "Daily commuter between Zagazig and Cairo. Quiet rides, punctual departures.",
      role: Role.USER,
      kycStatus: KycStatus.VERIFIED,
      kycIdNumber: "29805121301234",
      vehicles: {
        create: {
          make: "Hyundai",
          model: "Elantra CN7",
          year: 2023,
          color: "Silver",
          plateNumber: "س ج أ 4821",
          maxPassengerSeats: 4,
          trunkDescription: "Spacious sedan trunk — fits 2 large + 1 small bag",
          maxLuggageUnits: 7,
          isDefault: true,
        },
      },
    },
    include: { vehicles: true },
  });

  const omar = await prisma.user.create({
    data: {
      name: "Omar El-Sayed",
      email: "omar@along.eg",
      passwordHash,
      phone: "+201022223333",
      bio: "Tech lead commuting New Cairo ↔ Smart Village. AC always on.",
      role: Role.USER,
      kycStatus: KycStatus.VERIFIED,
      kycIdNumber: "29509010105678",
      vehicles: {
        create: {
          make: "Kia",
          model: "Cerato",
          year: 2022,
          color: "Midnight Blue",
          plateNumber: "ر ق م 9154",
          maxPassengerSeats: 4,
          trunkDescription: "Medium trunk — ideal for carry-ons and backpacks",
          maxLuggageUnits: 6,
          isDefault: true,
        },
      },
    },
    include: { vehicles: true },
  });

  // 2 Passengers (one Verified, one Pending KYC)
  const salma = await prisma.user.create({
    data: {
      name: "Salma Mahmoud",
      email: "salma@along.eg",
      passwordHash,
      phone: "+201033334444",
      bio: "Software engineer & frequent Cairo-Alexandria traveler.",
      role: Role.USER,
      kycStatus: KycStatus.VERIFIED,
      kycIdNumber: "29903150109988",
    },
  });

  const youssef = await prisma.user.create({
    data: {
      name: "Youssef Adel",
      email: "youssef@along.eg",
      passwordHash,
      phone: "+201044445555",
      bio: "Computer science student commuting weekly.",
      role: Role.USER,
      kycStatus: KycStatus.PENDING,
      kycIdNumber: "30107221304455",
      kycNote: "National ID submitted for student commuter verification.",
    },
  });

  const tomorrow8am = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow8am.setHours(8, 0, 0, 0);

  const tomorrow10am = new Date(tomorrow8am.getTime() + 2 * 60 * 60 * 1000);
  const inTwoDays9am = new Date(Date.now() + 48 * 60 * 60 * 1000);
  inTwoDays9am.setHours(9, 0, 0, 0);

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sampleRides = [
    {
      driverId: ahmed.id,
      vehicleId: ahmed.vehicles[0].id,
      originName: "Zagazig University Gate",
      originLat: 30.5877,
      originLng: 31.502,
      destName: "Cairo - Ramses Square",
      destLat: 30.0626,
      destLng: 31.2469,
      departureTime: tomorrow8am,
      estimatedArrivalTime: new Date(tomorrow8am.getTime() + 95 * 60 * 1000),
      totalSeats: 3,
      availableSeats: 2,
      price: 95,
      instantBooking: true,
      liveLocationSharingEnabled: true,
      maxLuggageUnits: 7,
      amenities: ["AC", "Max 2 in back", "Instant booking"],
      status: RideStatus.OPEN,
    },
    {
      driverId: omar.id,
      vehicleId: omar.vehicles[0].id,
      originName: "New Cairo - 5th Settlement",
      originLat: 30.0074,
      originLng: 31.4913,
      destName: "Smart Village - 6th of October",
      destLat: 30.0715,
      destLng: 31.0169,
      departureTime: tomorrow8am,
      estimatedArrivalTime: new Date(tomorrow8am.getTime() + 75 * 60 * 1000),
      totalSeats: 3,
      availableSeats: 0, // Full ride to showcase Standby Queue!
      price: 85,
      instantBooking: true,
      liveLocationSharingEnabled: true,
      maxLuggageUnits: 6,
      amenities: ["AC", "Instant booking"],
      status: RideStatus.OPEN,
    },
    {
      driverId: ahmed.id,
      vehicleId: ahmed.vehicles[0].id,
      originName: "Zagazig - Al-Qawmia",
      originLat: 30.5945,
      originLng: 31.491,
      destName: "Obour City - Carrefour",
      destLat: 30.2055,
      destLng: 31.4712,
      departureTime: tomorrow10am,
      estimatedArrivalTime: new Date(tomorrow10am.getTime() + 55 * 60 * 1000),
      totalSeats: 3,
      availableSeats: 3,
      price: 75,
      instantBooking: false,
      liveLocationSharingEnabled: false,
      maxLuggageUnits: 7,
      amenities: ["AC", "Max 2 in back"],
      status: RideStatus.OPEN,
    },
    {
      driverId: omar.id,
      vehicleId: omar.vehicles[0].id,
      originName: "Alexandria - Sidi Gaber",
      originLat: 31.2194,
      originLng: 29.9416,
      destName: "Cairo - Maadi",
      destLat: 29.9602,
      destLng: 31.2569,
      departureTime: inTwoDays9am,
      estimatedArrivalTime: new Date(inTwoDays9am.getTime() + 160 * 60 * 1000),
      totalSeats: 3,
      availableSeats: 3,
      price: 220,
      instantBooking: true,
      liveLocationSharingEnabled: true,
      maxLuggageUnits: 6,
      amenities: ["AC", "Pets allowed", "Instant booking"],
      status: RideStatus.OPEN,
    },
    {
      driverId: ahmed.id,
      vehicleId: ahmed.vehicles[0].id,
      originName: "Zagazig Train Station",
      originLat: 30.5835,
      originLng: 31.4982,
      destName: "Cairo - Heliopolis",
      destLat: 30.0911,
      destLng: 31.3292,
      departureTime: yesterday,
      estimatedArrivalTime: new Date(yesterday.getTime() + 90 * 60 * 1000),
      totalSeats: 3,
      availableSeats: 1,
      price: 90,
      instantBooking: true,
      liveLocationSharingEnabled: true,
      maxLuggageUnits: 7,
      amenities: ["AC", "Max 2 in back", "Instant booking"],
      status: RideStatus.COMPLETED,
    },
  ];

  const createdRides = [];
  for (const r of sampleRides) {
    const ride = await prisma.ride.create({
      data: {
        ...r,
        originH3Index: getH3Index(r.originLat, r.originLng),
      },
    });
    createdRides.push(ride);
  }

  // Confirmed booking on Zagazig -> Cairo ride (Ride 0)
  await prisma.booking.create({
    data: {
      rideId: createdRides[0].id,
      passengerId: salma.id,
      seatsRequested: 1,
      luggageSize: LuggageSize.MEDIUM,
      luggageUnits: 2,
      totalFare: 95,
      paymentStatus: PaymentStatus.SIMULATED_PAID,
      status: BookingStatus.CONFIRMED,
    },
  });

  // Confirmed booking filling New Cairo -> Smart Village (Ride 1)
  await prisma.booking.create({
    data: {
      rideId: createdRides[1].id,
      passengerId: salma.id,
      seatsRequested: 3,
      luggageSize: LuggageSize.SMALL,
      luggageUnits: 1,
      totalFare: 255,
      paymentStatus: PaymentStatus.SIMULATED_PAID,
      status: BookingStatus.CONFIRMED,
    },
  });

  // Standby request by Youssef on the full New Cairo -> Smart Village ride
  await prisma.standbyRequest.create({
    data: {
      rideId: createdRides[1].id,
      passengerId: youssef.id,
      seatsRequested: 1,
      luggageSize: LuggageSize.SMALL,
      luggageUnits: 1,
      status: StandbyStatus.WAITING,
    },
  });

  // Completed ride bookings & reviews
  await prisma.booking.create({
    data: {
      rideId: createdRides[4].id,
      passengerId: salma.id,
      seatsRequested: 1,
      luggageSize: LuggageSize.SMALL,
      luggageUnits: 1,
      totalFare: 90,
      paymentStatus: PaymentStatus.SIMULATED_PAID,
      status: BookingStatus.CONFIRMED,
    },
  });

  await prisma.booking.create({
    data: {
      rideId: createdRides[4].id,
      passengerId: youssef.id,
      seatsRequested: 1,
      luggageSize: LuggageSize.MEDIUM,
      luggageUnits: 2,
      totalFare: 90,
      paymentStatus: PaymentStatus.SIMULATED_PAID,
      status: BookingStatus.CONFIRMED,
    },
  });

  await prisma.review.createMany({
    data: [
      {
        rideId: createdRides[4].id,
        reviewerId: salma.id,
        revieweeId: ahmed.id,
        rating: 5,
        tags: ["Punctual", "Clean Car", "Safe Driving"],
        comment: "Smooth drive to Heliopolis and very respectful timing!",
      },
      {
        rideId: createdRides[4].id,
        reviewerId: youssef.id,
        revieweeId: ahmed.id,
        rating: 5,
        tags: ["Punctual", "Friendly", "Comfortable"],
        comment: "Great conversation and plenty of trunk space.",
      },
      {
        rideId: createdRides[4].id,
        reviewerId: ahmed.id,
        revieweeId: salma.id,
        rating: 5,
        tags: ["Punctual", "Friendly"],
        comment: "Ready on time at the pickup point.",
      },
    ],
  });

  // 1-to-1 Chat Room between Ahmed & Salma for Ride 0
  const room = await prisma.chatRoom.create({
    data: {
      rideId: createdRides[0].id,
      driverId: ahmed.id,
      passengerId: salma.id,
      messages: {
        create: [
          {
            senderId: null,
            body: "Booking Confirmed — 1 Seat, Medium Bag (95 EGP simulated paid)",
            isSystem: true,
          },
          {
            senderId: salma.id,
            body: "Hi Ahmed! I will be right outside Zagazig University main gate at 7:55 AM.",
          },
          {
            senderId: ahmed.id,
            body: "Perfect Salma! I will share live ETA once I head out.",
          },
        ],
      },
    },
  });

  // Saved Quick Searches for Salma
  await prisma.savedSearch.createMany({
    data: [
      {
        userId: salma.id,
        originName: "Zagazig University Gate",
        originLat: 30.5877,
        originLng: 31.502,
        destName: "Cairo - Ramses Square",
        destLat: 30.0626,
        destLng: 31.2469,
      },
      {
        userId: salma.id,
        originName: "New Cairo - 5th Settlement",
        originLat: 30.0074,
        originLng: 31.4913,
        destName: "Smart Village - 6th of October",
        destLat: 30.0715,
        destLng: 31.0169,
      },
    ],
  });

  console.log(
    `Seeded Along DB: admin (${admin.email}), users (ahmed@along.eg, omar@along.eg, salma@along.eg, youssef@along.eg), ${createdRides.length} rides, chat room ${room.id}.`
  );
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
