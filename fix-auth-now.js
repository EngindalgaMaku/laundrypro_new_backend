// Direct fix for the authentication issue
// Run this in your browser console or add to your app

console.log("🔧 Fixing authentication issue...");

// 1. Clear all authentication data
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('auth_token');
localStorage.clear();

// 2. Clear session storage too
sessionStorage.clear();

// 3. Clear any cookies
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log("✅ All authentication data cleared");
console.log("🔄 Please refresh the page and login again");

// 4. Force page reload
setTimeout(() => {
    window.location.href = '/login';
}, 1000);
