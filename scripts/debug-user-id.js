const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function debugUserId() {
  try {
    console.log('🔍 Debugging user ID mismatch...');
    
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: 'test@laundrypro.com' },
      include: { business: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Database User:', {
      id: user.id,
      email: user.email,
      businessId: user.businessId,
      hasBusinessInDB: !!user.business
    });
    
    // Check what's in localStorage (if available)
    console.log('\n🔑 Checking JWT token...');
    
    // Let's create a new token for this user to see what it should contain
    const correctToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        businessId: user.businessId,
        role: user.role,
      },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: "7d" }
    );
    
    console.log('✅ Correct token payload should be:', {
      userId: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    });
    
    console.log('\n📝 New token for test@laundrypro.com:');
    console.log(correctToken);
    
    // Verify the token works
    const decoded = jwt.verify(correctToken, process.env.NEXTAUTH_SECRET || 'your-secret-key');
    console.log('\n✅ Token verification successful:', decoded);
    
    // Check if there are multiple users with similar emails
    console.log('\n👥 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, businessId: true, role: true }
    });
    
    allUsers.forEach(u => {
      console.log(`- ${u.email} (ID: ${u.id}, BusinessID: ${u.businessId}, Role: ${u.role})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserId();
