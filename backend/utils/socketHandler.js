const { supabase } = require("../supabaseClient")

// Example: Listen to changes in bookings table
function listenToBookingUpdates(callback) {
  supabase.channel('public:bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
      callback(payload)
    })
    .subscribe()
}

module.exports = { listenToBookingUpdates }
