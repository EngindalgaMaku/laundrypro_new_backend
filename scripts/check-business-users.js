const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBusinessUsers() {
  try {
    console.log('🔍 Checking business users for test@laundrypro.com...');
    
    // Find test@laundrypro.com user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@laundrypro.com' },
      include: { business: true }
    });
    
    if (!testUser) {
      console.log('❌ test@laundrypro.com user not found');
      return;
    }
    
    console.log('👤 test@laundrypro.com user:', {
      id: testUser.id,
      email: testUser.email,
      businessId: testUser.businessId,
      businessName: testUser.business?.name
    });
    
    // Find all users in the same business
    console.log('\n🏢 Users in the same business:');
    const businessUsers = await prisma.user.findMany({
      where: { 
        businessId: testUser.businessId,
        isActive: true 
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        businessId: true
      }
    });
    
    businessUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });
    
    // Check zeynep user
    console.log('\n👤 zeynep@temizlik.com user:');
    const zeynepUser = await prisma.user.findUnique({
      where: { email: 'zeynep@temizlik.com' },
      include: { business: true }
    });
    
    if (zeynepUser) {
      console.log({
        id: zeynepUser.id,
        email: zeynepUser.email,
        businessId: zeynepUser.businessId,
        businessName: zeynepUser.business?.name
      });
    }
    
    console.log('\n🎯 The issue: API might be returning users from wrong business!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessUsers();
