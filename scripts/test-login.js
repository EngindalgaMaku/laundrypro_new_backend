const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('🔍 Testing login process for test@laundrypro.com...');
    
    const email = 'test@laundrypro.com';
    
    // Step 1: Find user by email (same as getUserByEmail)
    console.log('\n1️⃣ Looking up user by email...');
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessId: user.businessId,
      role: user.role
    });
    
    // Step 2: Get business info (same as login API)
    console.log('\n2️⃣ Looking up business info...');
    let businessInfo = null;
    try {
      businessInfo = await prisma.business.findFirst({
        where: { users: { some: { id: user.id } } },
      });
    } catch (error) {
      console.error("Business info error:", error);
    }
    
    if (businessInfo) {
      console.log('✅ Business found:', {
        id: businessInfo.id,
        name: businessInfo.name,
        businessType: businessInfo.businessType,
        email: businessInfo.email
      });
    } else {
      console.log('❌ No business found for user');
      businessInfo = {
        id: "temp_business_id",
        name: "LaundryPro İşletmesi",
        businessType: "LAUNDRY",
        email: user.email,
        phone: user.phone,
        address: null,
      };
      console.log('🔄 Using temporary business info:', businessInfo);
    }
    
    // Step 3: Create JWT token (same as login API)
    console.log('\n3️⃣ Creating JWT token...');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        businessId: businessInfo.id,
        role: user.role,
      },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: "7d" }
    );
    
    console.log('✅ Token created successfully');
    console.log('Token payload:', {
      userId: user.id,
      email: user.email,
      businessId: businessInfo.id,
      role: user.role,
    });
    
    // Step 4: Verify token
    console.log('\n4️⃣ Verifying token...');
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key');
    console.log('✅ Token verification successful:', decoded);
    
    console.log('\n🎯 Full token for test@laundrypro.com:');
    console.log(token);
    
  } catch (error) {
    console.error('❌ Error during login test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
