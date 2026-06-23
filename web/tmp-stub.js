const stubPages = ['Login', 'Register', 'VerifyOTP', 'Home', 'Search', 'CreateListing', 'ListingDetails', 'Favorites', 'Messages', 'Chat', 'Profile']
const fs = require('fs')
const path = require('path')
const dir = '/mnt/c/Users/LENOVO/Desktop/Projectsss/PocketTrade/web/src/pages'
stubPages.forEach(name => {
  fs.writeFileSync(path.join(dir, name + '.tsx'), `export default function ${name}() { return <div className="p-6">${name}</div> }\n`)
})
console.log('done')
