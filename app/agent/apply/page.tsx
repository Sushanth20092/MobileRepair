"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import dynamic from 'next/dynamic';
import { useRef, useCallback } from "react";
import mapboxgl from 'mapbox-gl';
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import MapboxPinDrop from '@/components/MapboxPinDrop';


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function AgentApplicationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  type City = { id: string; name: string; state_id: string; latitude: number | null; longitude: number | null; pincodes: string[] };
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [stateId, setStateId] = useState<string>("");
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null); // [lng, lat]
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Add latitude/longitude to formData
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    shopAddress: "",
    city_id: "",
    pincode: "",
    experience: "",
    specializations: [] as string[],
    idProof: null as string | null,
    shopImages: [] as string[],
    agreeToTerms: false,
    latitude: "",
    longitude: "",
  });

  const [applications, setApplications] = useState<any[]>([]);
  const [idProofError, setIdProofError] = useState("");
  const [shopImagesError, setShopImagesError] = useState("");

  const specializations = [
    "Mobile Phone Repair",
    "Tablet Repair",
    "Laptop Repair",
    "Smartwatch Repair",
    "Audio Device Repair",
    "Gaming Console Repair",
  ]

  // Fetch states on mount
  useEffect(() => {
    supabase.from('states').select('id, name').then(({ data }) => setStates(data || []));
  }, []);

  // Fetch all cities on mount (for filtering)
  useEffect(() => {
    supabase.from('cities').select('id, name, state_id, latitude, longitude, pincodes').then(({ data }) => {
      if (Array.isArray(data)) {
        // Filter out any cities missing required fields
        setCities(data.filter((c): c is City => c && c.id && c.name && c.state_id && typeof c.latitude === 'number' && typeof c.longitude === 'number' && Array.isArray(c.pincodes)));
      } else {
        setCities([]);
      }
    });
  }, []);

  // Filter cities by selected state
  useEffect(() => {
    if (stateId) {
      setFilteredCities(cities.filter(city => city.state_id === stateId));
    } else {
      setFilteredCities([]);
    }
    // Reset city and map when state changes
    setFormData(f => ({ ...f, city_id: "" }));
    setMapCenter(null);
    setPin(null);
  }, [stateId, cities]);

  // Center map on selected city
  useEffect(() => {
    if (formData.city_id) {
      const city = cities.find(c => c.id === formData.city_id);
      if (city && typeof city.latitude === 'number' && typeof city.longitude === 'number') {
        setMapCenter([city.longitude, city.latitude]);
        setPin([city.longitude, city.latitude]);
      }
    }
  }, [formData.city_id, cities]);

  const mapRef = useRef<any>(null);

  // Calculate bounding box for selected city
  const city = formData.city_id ? cities.find(c => c.id === formData.city_id) : null;
  const bounds: [number, number, number, number] | undefined =
    city && typeof city.latitude === 'number' && typeof city.longitude === 'number'
      ? [
          city.longitude - 0.1, city.latitude - 0.1, // SW
          city.longitude + 0.1, city.latitude + 0.1  // NE
        ]
      : undefined;

  // Handle pin drop on map
  const handleMapClick = async (e: any) => {
    if (!formData.city_id) return;
    const city = cities.find(c => c.id === formData.city_id);
    if (!city || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') return;
    // Bounding box: 0.1° buffer
    const minLat = city.latitude - 0.1;
    const maxLat = city.latitude + 0.1;
    const minLng = city.longitude - 0.1;
    const maxLng = city.longitude + 0.1;
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;
    if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
      // Optionally show a toast or error
      return;
    }
    setPin([lng, lat]);
    setFormData(f => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
    // Reverse geocode
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        // Find address and pincode
        const address = data.features[0].place_name || "";
        let pincode = "";
        for (const ctx of data.features[0].context || []) {
          if (ctx.id && ctx.id.startsWith("postcode")) {
            pincode = ctx.text;
            break;
          }
        }
        setFormData(f => ({ ...f, shopAddress: address, pincode, latitude: lat.toString(), longitude: lng.toString() }));
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    supabase.from('agent_applications').select('*').then(({ data }) => setApplications(data || []));
  }, []);

  useEffect(() => {
    // Redirect if not authenticated
    if (user === null) {
      toast({
        title: "Please log in to apply as an agent.",
        variant: "destructive",
      })
      router.replace("/auth/login")
    }
  }, [user, router, toast])

  const handleSpecializationToggle = (specialization: string) => {
    const newSpecializations = formData.specializations.includes(specialization)
      ? formData.specializations.filter((s) => s !== specialization)
      : [...formData.specializations, specialization]
    setFormData({ ...formData, specializations: newSpecializations })
  }

  const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const fileExt = file.name.split('.').pop()
      const filePath = `agent-id/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage.from('agent-id').upload(filePath, file)
      if (error) {
        toast({ title: "Error", description: `Failed to upload ID proof`, variant: "destructive" })
        return
      }
      const { data: publicUrlData } = supabase.storage.from('agent-id').getPublicUrl(filePath)
      setFormData({ ...formData, idProof: publicUrlData.publicUrl })
    }
  }

  const handleShopImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (formData.shopImages.length + files.length > 5) {
      toast({ title: "Error", description: "Maximum 5 shop images allowed", variant: "destructive" })
      return
    }
    const uploadedUrls: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const filePath = `agent-shop/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage.from('agent-shop').upload(filePath, file)
      if (error) {
        toast({ title: "Error", description: `Failed to upload shop image: ${file.name}`, variant: "destructive" })
        continue
      }
      const { data: publicUrlData } = supabase.storage.from('agent-shop').getPublicUrl(filePath)
      uploadedUrls.push(publicUrlData.publicUrl)
    }
    setFormData({ ...formData, shopImages: [...formData.shopImages, ...uploadedUrls] })
  }

  // Check for duplicate pending application for this user
  const hasPendingApplication = applications.some(
    (app: any) => app.user_id === user?.id && app.status === "pending"
  )

  // Update handleSubmit to include state_id and user_id, and redirect to /agent/request-submitted on success
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIdProofError("");
    setShopImagesError("");
    setIsLoading(true)
    try {
      // Fetch authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Error", description: "Could not verify your session. Please log in again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      // Compare emails
      if (formData.email.trim().toLowerCase() !== userData.user.email?.trim().toLowerCase()) {
        toast({ title: "Email mismatch", description: "Email mismatch. Please use the same email as your registered account.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      // Validate id_proof and shop_images
      let hasError = false;
      if (!formData.idProof) {
        setIdProofError("Please upload an ID proof document.");
        hasError = true;
      }
      if (!formData.shopImages || formData.shopImages.length < 1) {
        setShopImagesError("Please upload at least one shop image.");
        hasError = true;
      }
      if (hasError) {
        setIsLoading(false);
        return;
      }
      // Insert into agent_applications
      const { data, error } = await supabase.from('agent_applications').insert([
        {
          user_id: userData.user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          shop_name: formData.shopName,
          shop_address: formData.shopAddress,
          city_id: formData.city_id,
          state_id: stateId,
          pincode: formData.pincode,
          experience: formData.experience,
          specializations: formData.specializations,
          id_proof: formData.idProof,
          shop_images: formData.shopImages,
          agree_to_terms: formData.agreeToTerms,
          latitude: formData.latitude,
          longitude: formData.longitude,
          // status, reviewed_by, reviewed_at, created_at, updated_at are handled by default
        }
      ])
      if (error) throw error
      toast({ title: "Success", description: "Application submitted!" })
      router.push("/agent/request-submitted")
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit application.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  function getCityName(city_id: string) {
    const city = cities.find(c => c.id === city_id);
    return city ? city.name : '';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Join as Repair Agent</CardTitle>
              <CardDescription>Apply to become a certified repair agent and grow your business with us</CardDescription>
            </CardHeader>

            <CardContent>
              {hasPendingApplication ? (
                <div className="text-center text-yellow-600 font-semibold py-8">
                  <RequestSubmittedMessage />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          placeholder="Enter phone number"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Make sure you enter the same email used to register your account.
                      </p>
                    </div>
                  </div>

                  {/* Shop Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Shop Information</h3>
                    {/* Shop Name Field (moved above state) */}
                    <div className="space-y-2">
                      <Label htmlFor="shopName">Shop Name *</Label>
                      <Input
                        id="shopName"
                        placeholder="Enter your shop name"
                        value={formData.shopName}
                        onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                        required
                      />
                    </div>
                    {/* State Dropdown */}
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Select
                        value={stateId}
                        onValueChange={value => setStateId(value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={states.length === 0 ? "Loading states..." : "Select state"} />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map(state => (
                            <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* City Dropdown */}
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Select
                        value={formData.city_id}
                        onValueChange={value => setFormData(f => ({ ...f, city_id: value }))}
                        required
                        disabled={!stateId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={filteredCities.length === 0 ? "Select state first" : "Select city"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCities.map(city => (
                            <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Mapbox Map Section (moved under city, only show if city is selected) */}
                    {formData.city_id && mapCenter && typeof window !== 'undefined' && (
                      <div className="w-full h-72 my-4 rounded overflow-hidden border border-gray-300 relative">
                        <MapboxPinDrop
                          lat={pin ? pin[1] : null}
                          lng={pin ? pin[0] : null}
                          onPinDrop={(lat, lng) => {
                            setPin([lng, lat]);
                            setFormData(f => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
                          }}
                          center={(() => {
                            const city = cities.find(c => c.id === formData.city_id);
                            return city && typeof city.longitude === 'number' && typeof city.latitude === 'number'
                              ? [city.longitude, city.latitude]
                              : mapCenter;
                          })()}
                          bounds={(() => {
                            const city = cities.find(c => c.id === formData.city_id);
                            return city && typeof city.longitude === 'number' && typeof city.latitude === 'number'
                              ? [
                                  city.longitude - 0.1,
                                  city.latitude - 0.1,
                                  city.longitude + 0.1,
                                  city.latitude + 0.1
                                ]
                              : undefined;
                          })()}
                          mapboxToken={MAPBOX_TOKEN || ''}
                          style={{ width: '100%', height: '100%', borderRadius: 8 }}
                          onReverseGeocode={(address, pincode) => {
                            setFormData(f => ({ ...f, shopAddress: address, pincode }));
                          }}
                        />
                        <div className="text-xs text-gray-500 mt-1">Drop a pin to set your shop location. Address and pincode will autofill. You can edit the address if needed.</div>
                      </div>
                    )}
                    {/* Shop Address Field */}
                    <div className="space-y-2">
                      <Label htmlFor="shopAddress">Shop Address *</Label>
                      <Textarea
                        id="shopAddress"
                        placeholder="Enter complete shop address"
                        value={formData.shopAddress}
                        onChange={e => setFormData({ ...formData, shopAddress: e.target.value })}
                        required
                      />
                    </div>
                    {/* Add a visible, editable, required pincode field in the Shop Information section, after the shop address field */}
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        placeholder="Enter pincode"
                        value={formData.pincode}
                        onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                        required
                      />
                    </div>
                    {/* Hidden latitude/longitude fields */}
                    <input type="hidden" name="latitude" value={formData.latitude} />
                    <input type="hidden" name="longitude" value={formData.longitude} />
                  </div>

                  {/* Experience & Specializations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Experience & Specializations</h3>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Select
                        value={formData.experience}
                        onValueChange={(value) => setFormData({ ...formData, experience: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1">0-1 years</SelectItem>
                          <SelectItem value="1-3">1-3 years</SelectItem>
                          <SelectItem value="3-5">3-5 years</SelectItem>
                          <SelectItem value="5-10">5-10 years</SelectItem>
                          <SelectItem value="10+">10+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Specializations (Select all that apply)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {specializations.map((specialization) => (
                          <div key={specialization} className="flex items-center space-x-2">
                            <Checkbox
                              id={specialization}
                              checked={formData.specializations.includes(specialization)}
                              onCheckedChange={() => handleSpecializationToggle(specialization)}
                            />
                            <Label htmlFor={specialization} className="text-sm">
                              {specialization}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Documents</h3>

                    <div className="space-y-2">
                      <Label htmlFor="idProof">ID Proof (Aadhar/PAN/Driving License)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="flex text-sm text-muted-foreground">
                            <label
                              htmlFor="id-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                            >
                              <span>Upload ID proof</span>
                              <input
                                id="id-upload"
                                name="id-upload"
                                type="file"
                                className="sr-only"
                                accept="image/*,.pdf"
                                onChange={handleIdProofUpload}
                              />
                            </label>
                          </div>
                          {formData.idProof && <p className="text-sm text-green-600 mt-2">✓ {formData.idProof}</p>}
                          {idProofError && <p className="text-sm text-destructive mt-2">{idProofError}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopImages">Shop Images (Max 5)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="flex text-sm text-muted-foreground">
                            <label
                              htmlFor="shop-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                            >
                              <span>Upload shop images</span>
                              <input
                                id="shop-upload"
                                name="shop-upload"
                                type="file"
                                className="sr-only"
                                multiple
                                accept="image/*"
                                onChange={handleShopImagesUpload}
                              />
                            </label>
                          </div>
                          {formData.shopImages.length > 0 && (
                            <p className="text-sm text-green-600 mt-2">
                              ✓ {formData.shopImages.length} image(s) uploaded
                            </p>
                          )}
                          {shopImagesError && <p className="text-sm text-destructive mt-2">{shopImagesError}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Submitting Application..." : "Submit Application"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function RequestSubmittedMessage() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <h2 className="text-xl font-semibold mb-4">Your agent request has been submitted.</h2>
      <p className="mb-6 text-center">You'll be notified via email once reviewed.</p>
      <Button onClick={() => router.push("/")}>Back to Homepage</Button>
    </div>
  );
}
