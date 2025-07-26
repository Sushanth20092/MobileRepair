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
import { Upload, ArrowLeft, MapPin, AlertCircle } from "lucide-react"
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
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  // Add validation states (matching customer form pattern)
  const [pincodeError, setPincodeError] = useState("");
  const [postcodeChecked, setPostcodeChecked] = useState(false);
  const [locationOutOfBounds, setLocationOutOfBounds] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

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
    // Add city and state display fields (matching customer form)
    city: "",
    state: "",
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

  // Validate form completeness (matching customer form pattern)
  useEffect(() => {
    const hasValidPincode = Boolean(formData.pincode && postcodeChecked && !pincodeError);
    const hasValidLocation = Boolean(formData.latitude && formData.longitude && !locationOutOfBounds);
    const hasValidCityState = Boolean(formData.city_id && stateId);
    const hasRequiredFields = Boolean(formData.name && formData.email && formData.phone && formData.shopName && formData.shopAddress);
    const hasDocuments = Boolean(formData.idProof && formData.shopImages.length > 0);
    const hasAgreedToTerms = Boolean(formData.agreeToTerms);

    setIsFormValid(
      hasValidPincode && 
      hasValidLocation && 
      hasValidCityState && 
      hasRequiredFields && 
      hasDocuments && 
      hasAgreedToTerms
    );
  }, [formData, pincodeError, postcodeChecked, locationOutOfBounds, stateId]);

  // Helper function to normalize postcode (matching customer form)
  function normalizePostcode(value: string) {
    return value.replace(/\s+/g, '').toUpperCase().trim();
  }

  // Pincode validation and autofill logic (matching customer form pattern)
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizePostcode(raw);
    setFormData(prev => ({ ...prev, pincode: normalized }));
    setPincodeError("");
    setPostcodeChecked(false);
  };

  const handlePincodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const value = normalizePostcode(raw);
    if (!value) return;

    // Check if postcode exists in any city (matching customer form logic)
    let found = false;
    let foundCity = null;
    let foundState = null;
    
    for (const city of cities) {
      if (Array.isArray(city.pincodes) && city.pincodes.includes(value)) {
        found = true;
        foundCity = city;
        foundState = states.find(s => s.id === city.state_id) || null;
        break;
      }
    }

    if (found && foundCity && foundState) {
      setFormData(prev => ({
        ...prev, 
        pincode: value,
        city: foundCity.name,
        state: foundState.name,
        city_id: foundCity.id,
        latitude: typeof foundCity.latitude === 'number' ? foundCity.latitude.toString() : "",
        longitude: typeof foundCity.longitude === 'number' ? foundCity.longitude.toString() : "",
        shopAddress: "",
      }));
      setStateId(foundState.id);
      setPincodeError("");
      setPostcodeChecked(true);
      setLocationOutOfBounds(false);
      
      // Set map center to city center
      if (foundCity.latitude && foundCity.longitude) {
        setMapCenter([foundCity.longitude, foundCity.latitude]);
        setPin(null as [number, number] | null); // Clear previous pin
      }
    } else {
      setFormData(prev => ({
        ...prev, 
        city: "",
        state: "",
        city_id: "",
        latitude: "",
        longitude: "",
      }));
      setStateId("");
      setPincodeError("Service not available in this area.");
      setPostcodeChecked(false);
      setLocationOutOfBounds(false);
      setMapCenter(null);
      setPin(null);
    }
  };

  // Map pin validation logic (matching customer form bounds)
  const handleMapPinDrop = async (lat: number, lng: number) => {
    if (!formData.city_id) return;

    const city = cities.find(c => c.id === formData.city_id);
    if (!city || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') {
      return;
    }

    // Validate that location is within city bounds (0.1 degrees = ~11km, matching customer form)
    const isWithinBounds = 
      Math.abs(lat - city.latitude) < 0.1 && 
      Math.abs(lng - city.longitude) < 0.1;

    if (!isWithinBounds) {
      setLocationOutOfBounds(true);
      setFormData(prev => ({ 
        ...prev, 
        latitude: "", 
        longitude: "" 
      }));
      setPin(null);
      toast({
        title: "Location outside service area",
        description: "Sorry, we do not provide service to this location.",
        variant: "destructive"
      });
      return;
    }

    // Valid location - update form data
    setLocationOutOfBounds(false);
    setPin([lng, lat]);
    setFormData(prev => ({ 
      ...prev, 
      latitude: lat.toString(), 
      longitude: lng.toString() 
    }));

    // Reverse geocode to get address
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        const address = data.features[0].place_name || "";
        setFormData(prev => ({ ...prev, shopAddress: address }));
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  // Use My Location functionality (matching customer form pattern)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsLocationLoading(true);
    setLocationOutOfBounds(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Always center the map and drop the pin (matching customer form)
          setFormData(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          }));
          setPin([longitude, latitude]);
          
          // Get current city bounds
          const city = cities.find(c => c.id === formData.city_id);
          let bounds: [number, number, number, number] = [0, 0, 0, 0];
          if (city && city.latitude && city.longitude) {
            bounds = [city.longitude - 0.1, city.latitude - 0.1, city.longitude + 0.1, city.latitude + 0.1];
          }
          
          // Check if within bounds
          const isWithinBounds = 
            Math.abs(latitude - (city?.latitude || 0)) < 0.1 && 
            Math.abs(longitude - (city?.longitude || 0)) < 0.1;
          
          if (isWithinBounds && city) {
            setLocationOutOfBounds(false);
            // Set city and state values
            const foundState = states.find(s => s.id === city.state_id);
            setFormData(prev => ({
              ...prev,
              city: city.name,
              state: foundState ? foundState.name : "",
            }));
            
            // Reverse geocode
            try {
              const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`;
              const res = await fetch(url);
              const data = await res.json();
              
              if (data.features && data.features.length > 0) {
                let postalCode = "";
                // Find postal code in context
        for (const ctx of data.features[0].context || []) {
          if (ctx.id && ctx.id.startsWith("postcode")) {
                    postalCode = ctx.text;
            break;
                  }
                }
                
                if (postalCode) {
                  const normalized = normalizePostcode(postalCode);
                  setFormData(prev => ({ 
                    ...prev, 
                    pincode: normalized,
                    shopAddress: data.features[0].place_name || ""
                  }));
                  setPincodeError("");
                  setPostcodeChecked(true);
                }
              }
            } catch (error) {
              setFormData(prev => ({ ...prev, shopAddress: "" }));
              setPincodeError("Could not reverse geocode your location.");
              setPostcodeChecked(false);
            }
          } else {
            setLocationOutOfBounds(true);
            toast({
              title: "Location outside service area",
              description: "Sorry, we do not provide service to your current location.",
              variant: "destructive"
            });
            setPostcodeChecked(false);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to get your location details.",
            variant: "destructive",
          });
        } finally {
          setIsLocationLoading(false);
        }
      },
      (error) => {
        setIsLocationLoading(false);
        toast({
          title: "Location access denied",
          description: "Please allow location access to use this feature.",
          variant: "destructive",
        });
      }
    );
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
      try {
        console.log("Uploading ID proof:", file.name, file.size);
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "Error", description: "File size too large. Maximum 10MB allowed.", variant: "destructive" });
          return;
        }

      const fileExt = file.name.split('.').pop()
      const filePath = `agent-id/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        
        console.log("Uploading to path:", filePath);
        
      const { data, error } = await supabase.storage.from('agent-id').upload(filePath, file)
        
      if (error) {
          console.error("Upload error:", error);
          toast({ title: "Error", description: `Failed to upload ID proof: ${error.message}`, variant: "destructive" })
        return
      }
        
        console.log("Upload successful:", data);
        
      const { data: publicUrlData } = supabase.storage.from('agent-id').getPublicUrl(filePath)
        console.log("Public URL:", publicUrlData.publicUrl);
        
      setFormData({ ...formData, idProof: publicUrlData.publicUrl })
        toast({ title: "Success", description: "ID proof uploaded successfully!" })
      } catch (error) {
        console.error("Upload exception:", error);
        toast({ title: "Error", description: "An unexpected error occurred during upload", variant: "destructive" })
      }
    }
  }

  const handleShopImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (formData.shopImages.length + files.length > 5) {
      toast({ title: "Error", description: "Maximum 5 shop images allowed", variant: "destructive" })
      return
    }
    
    console.log("Uploading shop images:", files.length, "files");
    
    const uploadedUrls: string[] = []
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      try {
        console.log("Uploading shop image:", file.name, file.size);
        
        // Validate file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "Error", description: `File ${file.name} is too large. Maximum 10MB allowed.`, variant: "destructive" });
          errorCount++;
          continue;
        }

      const fileExt = file.name.split('.').pop()
      const filePath = `agent-shop/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        
        console.log("Uploading to path:", filePath);
        
      const { data, error } = await supabase.storage.from('agent-shop').upload(filePath, file)
        
      if (error) {
          console.error("Upload error for", file.name, ":", error);
          toast({ title: "Error", description: `Failed to upload shop image: ${file.name} - ${error.message}`, variant: "destructive" })
          errorCount++;
        continue
      }
        
        console.log("Upload successful for", file.name, ":", data);
        
      const { data: publicUrlData } = supabase.storage.from('agent-shop').getPublicUrl(filePath)
      uploadedUrls.push(publicUrlData.publicUrl)
        successCount++;
        
      } catch (error) {
        console.error("Upload exception for", file.name, ":", error);
        errorCount++;
      }
    }
    
    if (uploadedUrls.length > 0) {
    setFormData({ ...formData, shopImages: [...formData.shopImages, ...uploadedUrls] })
    }
    
    if (successCount > 0) {
      toast({ title: "Success", description: `Successfully uploaded ${successCount} image(s)` })
    }
    
    if (errorCount > 0) {
      toast({ title: "Warning", description: `${errorCount} image(s) failed to upload`, variant: "destructive" })
    }
  }

  // Check for duplicate pending application for this user
  const hasPendingApplication = applications.some(
    (app: any) => app.user_id === user?.id && app.status === "pending"
  )

  // Update handleSubmit to include state_id and user_id, and redirect to /agent/request-submitted on success
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Final validation before submission (matching customer form pattern)
    if (!isFormValid) {
      toast({
        title: "Form incomplete",
        description: "Please complete all required fields and ensure your location is valid.",
        variant: "destructive",
      });
      return;
    }

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

  function getStateName(state_id: string) {
    const state = states.find(s => s.id === state_id);
    return state ? state.name : '';
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
                    
                    {/* Shop Name Field */}
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

                    {/* Pincode Field - moved directly below Shop Name */}
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="pincode"
                          placeholder="Enter pincode"
                          value={formData.pincode}
                          onChange={handlePincodeChange}
                          onBlur={handlePincodeBlur}
                        required
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleUseMyLocation}
                          disabled={isLocationLoading}
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          {isLocationLoading ? "Loading..." : "Use My Location"}
                        </Button>
                      </div>
                      {pincodeError && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          {pincodeError}
                        </div>
                      )}
                    </div>

                    {/* City Display Field (readonly) */}
                    <div className="space-y-2">
                      <Label htmlFor="cityDisplay">City</Label>
                      <Input
                        id="cityDisplay"
                        value={formData.city || ""}
                        readOnly
                        className="bg-gray-100 border-gray-300 text-gray-700"
                        placeholder="City will autofill"
                      />
                    </div>

                    {/* State Display Field (readonly) */}
                    <div className="space-y-2">
                      <Label htmlFor="stateDisplay">State</Label>
                      <Input
                        id="stateDisplay"
                        value={formData.state || ""}
                        readOnly
                        className="bg-gray-100 border-gray-300 text-gray-700"
                        placeholder="State will autofill"
                      />
                    </div>

                    {/* Hidden fields for city_id and state_id */}
                    <input type="hidden" name="city_id" value={formData.city_id} />
                    <input type="hidden" name="state_id" value={stateId} />

                    {/* Map Section - always visible (matching customer form) */}
                    <div className="space-y-2">
                      <Label>Shop Location *</Label>
                      <div className="w-full h-72 rounded overflow-hidden border border-gray-300 relative">
                        <MapboxPinDrop
                          lat={pin ? pin[1] : null}
                          lng={pin ? pin[0] : null}
                          onPinDrop={handleMapPinDrop}
                          center={(() => {
                            if (formData.latitude && formData.longitude) {
                              return [parseFloat(formData.longitude), parseFloat(formData.latitude)];
                            }
                            // Center on city if available
                            const city = cities.find(c => c.id === formData.city_id);
                            return city && city.latitude && city.longitude ? [city.longitude, city.latitude] : [0, 0];
                          })()}
                          bounds={(() => {
                            const city = cities.find(c => c.id === formData.city_id);
                            if (city && city.latitude && city.longitude) {
                              return [city.longitude - 0.1, city.latitude - 0.1, city.longitude + 0.1, city.latitude + 0.1] as [number, number, number, number];
                            }
                            return [0, 0, 0, 0] as [number, number, number, number];
                          })()}
                          mapboxToken={MAPBOX_TOKEN || ''}
                          style={{ width: '100%', height: '100%', borderRadius: 8 }}
                        />
                      </div>
                      {locationOutOfBounds && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          Sorry, we do not provide service to this location.
                      </div>
                    )}
                      <p className="text-xs text-muted-foreground">
                        Drop a pin to set your shop location. Address will be autofilled.
                      </p>
                    </div>

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
                      <Label htmlFor="idProof">ID Proof (Passport, Driving License)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="flex text-sm text-muted-foreground justify-center">
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
                          <p className="text-xs text-muted-foreground mt-1">Max file size: 10MB. Supported: JPG, PNG, PDF</p>
                          {formData.idProof && (
                            <div className="mt-2">
                              <p className="text-sm text-green-600">✓ ID proof uploaded successfully</p>
                              <p className="text-xs text-muted-foreground truncate">{formData.idProof}</p>
                            </div>
                          )}
                          {idProofError && <p className="text-sm text-destructive mt-2">{idProofError}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopImages">Shop Images (Max 5)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="flex text-sm text-muted-foreground justify-center">
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
                          <p className="text-xs text-muted-foreground mt-1">Max 5 images, 10MB each. Supported: JPG, PNG</p>
                          {formData.shopImages.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-green-600">✓ {formData.shopImages.length} image(s) uploaded</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                {formData.shopImages.map((url, index) => (
                                  <p key={index} className="truncate">Image {index + 1}: {url}</p>
                                ))}
                              </div>
                            </div>
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
                      onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked === true })}
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

                  <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
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
