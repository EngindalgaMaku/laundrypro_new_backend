const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixZeynepUser() {
  try {
    console.log('🔧 Fixing zeynep@temizlik.com user...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'zeynep@temizlik.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Found user:', user.email, 'ID:', user.id);
    
    // Check if there's an existing business named "zeynep's Business"
    let business = await prisma.business.findFirst({
      where: { name: "zeynep's Business" }
    });
    
    if (business) {
      console.log('🏢 Found existing business:', business.name, 'ID:', business.id);
      
      // Associate user with the business
      await prisma.user.update({
        where: { id: user.id },
        data: { businessId: business.id }
      });
      
      console.log('✅ Associated user with existing business');
    } else {
      // Create a new business for Zeynep
      business = await prisma.business.create({
        data: {
          name: "Zeynep's Cleaning Service",
          businessType: 'LAUNDRY',
          email: 'zeynep@temizlik.com',
          phone: '0555 000 00 00',
          address: 'Sample Address',
          city: 'istanbul',
          district: 'kadikoy',
          description: 'Zeynep\'s cleaning business'
        }
      });
      
      console.log('🏢 Created new business:', business.name, 'ID:', business.id);
      
      // Associate user with the new business
      await prisma.user.update({
        where: { id: user.id },
        data: { businessId: business.id }
      });
      
      console.log('✅ Associated user with new business');
    }
    
    // Verify the fix
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'zeynep@temizlik.com' },
      include: { business: true }
    });
    
    console.log('✅ User fixed:', {
      email: updatedUser.email,
      businessId: updatedUser.businessId,
      businessName: updatedUser.business?.name
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixZeynepUser();
