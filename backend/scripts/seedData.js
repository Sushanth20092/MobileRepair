const { supabase } = require("../supabaseClient");

async function seed() {
  const { error } = await supabase.from("cities").insert([
    {
      name: "Bangalore",
      state: "Karnataka",
      pincodes: ["560001", "560002", "560003"],
      is_active: true,
      delivery_charges_standard: 60,
      delivery_charges_express: 120
    },
    {
      name: "Chennai",
      state: "Tamil Nadu",
      pincodes: ["600001", "600002", "600003"],
      is_active: true,
      delivery_charges_standard: 55,
      delivery_charges_express: 110
    }
  ]);

  if (error) console.error("Insert error:", error);
  else console.log("Cities seeded successfully");
}

if (require.main === module) {
  seed().then(() => console.log("Seed complete")).catch(console.error);
}
