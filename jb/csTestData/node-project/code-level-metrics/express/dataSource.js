const userData = [
    {
      username: 'bob',
      email: 'bob@codestream.com',
      address: {
        street: '123 W. Here',
        zip: '11111'
      },
      phone: {
        countryCode: '3',
        number: '5555555555'
      }
    },
    {
      username: 'joe',
      email: 'joe@codestream.com'
    }
  ]
  
  function collectStreetAddresses() {
    const addresses = userData.map((data) => data.address.street)
    return addresses
  }
  
  function collectZipCodes() {
    const zipCodes = userData.map((data) => data.address.zip)
    return zipCodes
  }
  
  function collectPhoneNumbers() {
    const phones = userData.map(
      (data) => `${data.phone.countryCode} ${data.phone.number}`
    )
    return phones
  }
  
  module.exports = {
    collectStreetAddresses,
    collectZipCodes,
    collectPhoneNumbers
  }
  