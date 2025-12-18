import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  // Clean existing data
  await prisma.jobActivity.deleteMany();
  await prisma.jobMedia.deleteMany();
  await prisma.jobServiceLine.deleteMany();
  await prisma.job.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.serviceCatalog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeSettings.deleteMany();

  // Create store settings
  await prisma.storeSettings.create({
    data: {
      id: "default",
      storeName: "Golden Touch Jewelers",
      phone: "(555) 123-4567",
      email: "info@goldentouchjewelers.com",
      address: "123 Main Street\nNew York, NY 10001",
      businessHours: "Mon-Fri: 10am-7pm\nSat: 10am-5pm\nSun: Closed",
      smsEnabled: true,
      smsProvider: "twilio",
      smsFromNumber: "+15551234567",
    },
  });

  // Create users
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.create({
    data: {
      name: "Sarah Johnson",
      email: "admin@jewelry.com",
      password: hashedPassword,
      role: "OWNER",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Mike Chen",
      email: "mike@jewelry.com",
      password: hashedPassword,
      role: "MANAGER",
    },
  });

  const jeweler1 = await prisma.user.create({
    data: {
      name: "David Martinez",
      email: "david@jewelry.com",
      password: hashedPassword,
      role: "JEWELER",
    },
  });

  const jeweler2 = await prisma.user.create({
    data: {
      name: "Lisa Wong",
      email: "lisa@jewelry.com",
      password: hashedPassword,
      role: "JEWELER",
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Tom Wilson",
      email: "tom@jewelry.com",
      password: hashedPassword,
      role: "STAFF",
    },
  });

  console.log("Created users");

  // Create service catalog
  const services = await Promise.all([
    prisma.serviceCatalog.create({
      data: { name: "Ring Sizing (Up)", defaultUnitPriceCents: 4500 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Ring Sizing (Down)", defaultUnitPriceCents: 4000 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Prong Retipping", defaultUnitPriceCents: 3500 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Chain Repair", defaultUnitPriceCents: 2500 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Watch Battery Replacement", defaultUnitPriceCents: 1500 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Clasp Repair", defaultUnitPriceCents: 3000 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Stone Setting", defaultUnitPriceCents: 5500 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Rhodium Plating", defaultUnitPriceCents: 4000 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Polishing & Cleaning", defaultUnitPriceCents: 2000 },
    }),
    prisma.serviceCatalog.create({
      data: { name: "Engraving", defaultUnitPriceCents: 3500 },
    }),
  ]);

  console.log("Created service catalog");

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: "Emily",
        lastName: "Thompson",
        phone: "(555) 234-5678",
        email: "emily.thompson@email.com",
        vip: true,
        lastVisitAt: new Date("2024-12-01"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "James",
        lastName: "Anderson",
        phone: "(555) 345-6789",
        email: "james.a@email.com",
        vip: false,
        lastVisitAt: new Date("2024-12-05"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Maria",
        lastName: "Garcia",
        phone: "(555) 456-7890",
        email: "maria.garcia@email.com",
        vip: true,
        lastVisitAt: new Date("2024-12-08"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Robert",
        lastName: "Williams",
        phone: "(555) 567-8901",
        email: "rwilliams@email.com",
        vip: false,
        lastVisitAt: new Date("2024-11-28"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Jennifer",
        lastName: "Brown",
        phone: "(555) 678-9012",
        email: "jen.brown@email.com",
        vip: false,
        lastVisitAt: new Date("2024-12-10"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Michael",
        lastName: "Davis",
        phone: "(555) 789-0123",
        email: "mdavis@email.com",
        vip: true,
        lastVisitAt: new Date("2024-12-09"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Susan",
        lastName: "Miller",
        phone: "(555) 890-1234",
        email: "susan.m@email.com",
        vip: false,
        lastVisitAt: new Date("2024-11-15"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "William",
        lastName: "Taylor",
        phone: "(555) 901-2345",
        email: "wtaylor@email.com",
        vip: false,
        lastVisitAt: new Date("2024-12-03"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Patricia",
        lastName: "Moore",
        phone: "(555) 012-3456",
        email: "patricia.moore@email.com",
        vip: true,
        lastVisitAt: new Date("2024-12-11"),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: "Christopher",
        lastName: "Lee",
        phone: "(555) 123-4568",
        email: "chris.lee@email.com",
        vip: false,
        lastVisitAt: new Date("2024-12-07"),
      },
    }),
  ]);

  console.log("Created customers");

  // Helper to generate job numbers
  let jobCounter = 10001;
  const getJobNumber = () => jobCounter++;

  // Create jobs with various statuses
  const jobs = [];

  // INTAKE jobs (3)
  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[0].id,
        status: "INTAKE",
        itemType: "Ring",
        itemMetal: "Yellow Gold",
        itemStone: "Diamond",
        description: "14k yellow gold engagement ring with 1ct center diamond",
        issue: "Ring needs to be sized from 7 to 6.5",
        promisedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler1.id,
        depositCents: 5000,
        services: {
          create: [
            {
              serviceCatalogId: services[0].id,
              name: services[0].name,
              qty: 1,
              unitPriceCents: services[0].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Sarah Johnson",
              userId: admin.id,
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[1].id,
        status: "INTAKE",
        itemType: "Watch",
        itemMetal: "Titanium",
        description: "Omega Seamaster automatic watch",
        issue: "Battery replacement and water resistance check",
        promisedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assigneeId: null,
        depositCents: 0,
        services: {
          create: [
            {
              serviceCatalogId: services[4].id,
              name: services[4].name,
              qty: 1,
              unitPriceCents: services[4].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Mike Chen",
              userId: manager.id,
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[2].id,
        status: "INTAKE",
        itemType: "Necklace",
        itemMetal: "White Gold",
        itemStone: "Pearl",
        description: "18k white gold necklace with freshwater pearls",
        issue: "Clasp is broken, needs replacement",
        promisedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler2.id,
        depositCents: 3000,
        services: {
          create: [
            {
              serviceCatalogId: services[5].id,
              name: services[5].name,
              qty: 1,
              unitPriceCents: services[5].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Tom Wilson",
              userId: staff.id,
            },
          ],
        },
      },
    })
  );

  // IN_PROGRESS jobs (4)
  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[3].id,
        status: "IN_PROGRESS",
        itemType: "Ring",
        itemMetal: "Platinum",
        itemStone: "Sapphire",
        description: "Platinum band with center sapphire and diamond accents",
        issue: "Multiple prongs need retipping, stone is loose",
        promisedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler1.id,
        depositCents: 10000,
        services: {
          create: [
            {
              serviceCatalogId: services[2].id,
              name: services[2].name,
              qty: 4,
              unitPriceCents: services[2].defaultUnitPriceCents,
            },
            {
              serviceCatalogId: services[8].id,
              name: services[8].name,
              qty: 1,
              unitPriceCents: services[8].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Sarah Johnson",
              userId: admin.id,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[4].id,
        status: "IN_PROGRESS",
        itemType: "Bracelet",
        itemMetal: "Sterling Silver",
        description: "Sterling silver charm bracelet",
        issue: "Chain repair needed, several links broken",
        promisedAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler2.id,
        depositCents: 2500,
        services: {
          create: [
            {
              serviceCatalogId: services[3].id,
              name: services[3].name,
              qty: 1,
              unitPriceCents: services[3].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Mike Chen",
              userId: manager.id,
              createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by Lisa Wong",
              userId: jeweler2.id,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[5].id,
        status: "IN_PROGRESS",
        itemType: "Ring",
        itemMetal: "White Gold",
        itemStone: "Diamond",
        description: "14k white gold wedding band",
        issue: "Rhodium plating needed, ring has yellowed",
        promisedAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler1.id,
        depositCents: 0,
        services: {
          create: [
            {
              serviceCatalogId: services[7].id,
              name: services[7].name,
              qty: 1,
              unitPriceCents: services[7].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Sarah Johnson",
              userId: admin.id,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[6].id,
        status: "IN_PROGRESS",
        itemType: "Pendant",
        itemMetal: "Rose Gold",
        itemStone: "Ruby",
        description: "Rose gold heart pendant with ruby center",
        issue: "Stone fell out, needs to be reset",
        promisedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
        assigneeId: jeweler2.id,
        depositCents: 7500,
        services: {
          create: [
            {
              serviceCatalogId: services[6].id,
              name: services[6].name,
              qty: 1,
              unitPriceCents: services[6].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Tom Wilson",
              userId: staff.id,
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by Lisa Wong",
              userId: jeweler2.id,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  // READY jobs (4)
  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[7].id,
        status: "READY",
        itemType: "Ring",
        itemMetal: "Yellow Gold",
        itemStone: "Emerald",
        description: "Vintage 18k gold ring with emerald",
        issue: "Ring sizing and prong check",
        promisedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler1.id,
        depositCents: 5000,
        services: {
          create: [
            {
              serviceCatalogId: services[1].id,
              name: services[1].name,
              qty: 1,
              unitPriceCents: services[1].defaultUnitPriceCents,
            },
            {
              serviceCatalogId: services[2].id,
              name: services[2].name,
              qty: 2,
              unitPriceCents: services[2].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Sarah Johnson",
              userId: admin.id,
              createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from IN_PROGRESS to READY by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
              type: "SMS_SENT",
              message: 'SMS sent to (555) 901-2345: "Your ring is ready for pickup!"',
              userId: staff.id,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[8].id,
        status: "READY",
        itemType: "Earrings",
        itemMetal: "White Gold",
        itemStone: "Diamond",
        description: "Diamond stud earrings, 0.5ct each",
        issue: "Post repair on one earring",
        promisedAt: new Date(Date.now()),
        assigneeId: jeweler2.id,
        depositCents: 2000,
        services: {
          create: [
            {
              serviceCatalogId: null,
              name: "Earring Post Repair",
              qty: 1,
              unitPriceCents: 4500,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Mike Chen",
              userId: manager.id,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by Lisa Wong",
              userId: jeweler2.id,
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from IN_PROGRESS to READY by Lisa Wong",
              userId: jeweler2.id,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[9].id,
        status: "READY",
        itemType: "Watch",
        itemMetal: "Other",
        description: "Rolex Submariner",
        issue: "Complete service and battery",
        promisedAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assigneeId: manager.id,
        depositCents: 15000,
        services: {
          create: [
            {
              serviceCatalogId: services[4].id,
              name: services[4].name,
              qty: 1,
              unitPriceCents: services[4].defaultUnitPriceCents,
            },
            {
              serviceCatalogId: null,
              name: "Watch Service",
              qty: 1,
              unitPriceCents: 25000,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Sarah Johnson",
              userId: admin.id,
              createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by Mike Chen",
              userId: manager.id,
              createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from IN_PROGRESS to READY by Mike Chen",
              userId: manager.id,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[0].id,
        status: "READY",
        itemType: "Ring",
        itemMetal: "Platinum",
        itemStone: "Diamond",
        description: "Platinum eternity band",
        issue: "Engraving - anniversary date",
        promisedAt: new Date(Date.now()),
        assigneeId: jeweler1.id,
        depositCents: 0,
        services: {
          create: [
            {
              serviceCatalogId: services[9].id,
              name: services[9].name,
              qty: 1,
              unitPriceCents: services[9].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Tom Wilson",
              userId: staff.id,
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from IN_PROGRESS to READY by David Martinez",
              userId: jeweler1.id,
            },
          ],
        },
      },
    })
  );

  // PICKED_UP jobs (2)
  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[1].id,
        status: "PICKED_UP",
        itemType: "Necklace",
        itemMetal: "Yellow Gold",
        itemStone: "None",
        description: "Gold chain necklace",
        issue: "Chain repair",
        promisedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler2.id,
        depositCents: 2500,
        services: {
          create: [
            {
              serviceCatalogId: services[3].id,
              name: services[3].name,
              qty: 1,
              unitPriceCents: services[3].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Sarah Johnson",
              userId: admin.id,
              createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by Lisa Wong",
              userId: jeweler2.id,
              createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from IN_PROGRESS to READY by Lisa Wong",
              userId: jeweler2.id,
              createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from READY to PICKED_UP by Tom Wilson",
              userId: staff.id,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  jobs.push(
    await prisma.job.create({
      data: {
        jobNumber: getJobNumber(),
        customerId: customers[3].id,
        status: "PICKED_UP",
        itemType: "Ring",
        itemMetal: "White Gold",
        itemStone: "Diamond",
        description: "Engagement ring",
        issue: "Sizing and cleaning",
        promisedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        assigneeId: jeweler1.id,
        depositCents: 0,
        services: {
          create: [
            {
              serviceCatalogId: services[0].id,
              name: services[0].name,
              qty: 1,
              unitPriceCents: services[0].defaultUnitPriceCents,
            },
            {
              serviceCatalogId: services[8].id,
              name: services[8].name,
              qty: 1,
              unitPriceCents: services[8].defaultUnitPriceCents,
            },
          ],
        },
        activities: {
          create: [
            {
              type: "CREATED",
              message: "Job created by Mike Chen",
              userId: manager.id,
              createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from INTAKE to IN_PROGRESS by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from IN_PROGRESS to READY by David Martinez",
              userId: jeweler1.id,
              createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            },
            {
              type: "STATUS_CHANGE",
              message: "Status changed from READY to PICKED_UP by Sarah Johnson",
              userId: admin.id,
              createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
    })
  );

  console.log("Created jobs");
  console.log("\nSeed completed!");
  console.log("\nLogin credentials:");
  console.log("  Email: admin@jewelry.com");
  console.log("  Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
