const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserBusiness() {
  try {
    console.log('🔍 Checking test@laundrypro.com user...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'test@laundrypro.com' },
      include: { business: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      businessId: user.businessId,
      business: user.business
    });
    
    // Check all businesses
    console.log('\n🏢 All businesses in database:');
    const businesses = await prisma.business.findMany({
      include: { users: true }
    });
    
    businesses.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name} (ID: ${business.id})`);
      console.log(`   - Type: ${business.businessType}`);
      console.log(`   - Email: ${business.email}`);
      console.log(`   - City: ${business.city}, District: ${business.district}`);
      console.log(`   - Users: ${business.users.length}`);
      business.users.forEach(u => {
        console.log(`     * ${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`);
      });
      console.log('');
    });
    
    // Check if there are any users without businesses
    console.log('👥 Users without businesses:');
    const usersWithoutBusiness = await prisma.user.findMany({
      where: { businessId: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });
    
    usersWithoutBusiness.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBusiness();
