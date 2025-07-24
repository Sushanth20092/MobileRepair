"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Upload, X, MapPin, CalendarIcon, ArrowLeft, ArrowRight, CheckCircle, CreditCard, Banknote } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { supabase } from "@/lib/api"
import { formatGBP } from "@/lib/utils"
import dynamic from "next/dynamic";
import MapboxPinDrop from '@/components/MapboxPinDrop';
import { debouncedSaveDraft, loadDraftForUser, clearDraft, isDraftExpired } from '@/hooks/useBookingDraft';

type Category = { id: string; name: string };
type Brand = { id: string; name: string; category_id: string };

// Add new type for Fault
interface Fault {
  id: string;
  name: string;
  price: number;
}

type StateType = { id: string; name: string };
// Update CityType to include state_id
type CityType = { id: string; name: string; state_id: string; pincodes?: string[]; latitude?: number; longitude?: number };

// Agent type for Local Dropoff
type Agent = {
  id: string;
  name: string;
  shop_name: string;
  shop_address_street: string;
  shop_address_pincode: string;
  phone: string;
  rating_average: number;
  rating_count: number;
  completed_jobs: number;
  latitude: number;
  longitude: number;
  city_id: string;
  status: string;
  distance?: number; // Computed distance from customer location
};





export default function BookRepairPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const mapRef = useRef<any>(null);

  // Form data - reset to initial state
  const [formData, setFormData] = useState({
    category: "",
    brand: "",
    model: "",
    faults: [] as string[],
    customFault: "",
    images: [] as string[],
    serviceType: "",
    selectedAgent: "",
    address: "",
    pincode: "",
    city_id: "", // hidden, autofilled
    collectionDate: undefined as Date | undefined,
    collectionTime: "",
    deliveryDate: undefined as Date | undefined,
    deliveryTime: "",
    duration: "",
    promoCode: "",
    paymentMethod: "",
    newModel: "", // Added for new model input
    customModel: "", // Added for custom model input
    // Address fields for booking flow
    address_pincode: "",
    address_city: "",
    address_state: "",
    address_street: "",
    address_landmark: "",
    state_id: "", // hidden, autofilled
    address_latitude: null as number | null,
    address_longitude: null as number | null,
    address_full: "", // visible or readonly
    location_type: "residential", // default to Home
    imei_number: "",
  })

  // Reset form state on component mount
  useEffect(() => {
    console.log("🔄 BookRepairPage: Component mounted, resetting form state");
    setCurrentStep(1);
    setIsLoading(false);
    setFormData({
      category: "",
      brand: "",
      model: "",
      faults: [] as string[],
      customFault: "",
      images: [] as string[],
      serviceType: "",
      selectedAgent: "",
      address: "",
      pincode: "",
      city_id: "",
      collectionDate: undefined,
      collectionTime: "",
      deliveryDate: undefined,
      deliveryTime: "",
      duration: "",
      promoCode: "",
      paymentMethod: "",
      newModel: "",
      customModel: "",
      address_pincode: "",
      address_city: "",
      address_state: "",
      address_street: "",
      address_landmark: "",
      state_id: "",
      address_latitude: null,
      address_longitude: null,
      address_full: "",
      location_type: "residential",
      imei_number: "",
    });
    setSelectedFaults([]);
    setDeviceId("");
  }, []);

  const steps = [
    { id: 1, title: "Device Details", description: "Select your device and issues" },
    { id: 2, title: "Select Location", description: "Choose your dropoff location" },
    { id: 3, title: "Service Type", description: "Choose how you want to get it repaired" },
    { id: 4, title: "Duration & Summary", description: "Review and confirm your booking" },
    { id: 5, title: "Payment", description: "Complete your payment" },
  ]

  const [cities, setCities] = useState<CityType[]>([])
  const [states, setStates] = useState<StateType[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [statesLoading, setStatesLoading] = useState(true)
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [userCity, setUserCity] = useState<string>("")
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  // Add models state
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  // Add state for faults fetched from Supabase
  const [faults, setFaults] = useState<Fault[]>([]);
  const [faultsLoading, setFaultsLoading] = useState(false);
  // Add state for selected deviceId (model selection should yield deviceId)
  const [deviceId, setDeviceId] = useState<string>("");
  // 1. Add a new state for user profile (to get city_id)
  const [userProfile, setUserProfile] = useState<any>(null);
  // Add state for service types
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(true);
  // Add state for duration types
  const [durationTypes, setDurationTypes] = useState<any[]>([]);
  const [durationTypesLoading, setDurationTypesLoading] = useState(true);
  
  // Agent filtering states for Local Dropoff
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);

  // Add a new state for locationOutOfBounds
  const [locationOutOfBounds, setLocationOutOfBounds] = useState(false);

  // Add a new state for duration error
  const [durationError, setDurationError] = useState("");

  // Add IMEI number to form state
  const [imeiError, setImeiError] = useState("");

  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  // Replace getMinDate and getMaxDate with client-safe state
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);

  useEffect(() => {
    // Only run on client
    const today = new Date();
    setMinDate(today);
    const max = new Date(today);
    max.setDate(today.getDate() + 2);
    setMaxDate(max);
  }, []);

  useEffect(() => {
    // Fetch states
    supabase.from('states').select('*').then(({ data, error }) => {
      setStates(data || [])
      setStatesLoading(false)
    })
    // Fetch cities
    supabase.from('cities').select('*').then(({ data, error }) => {
      setCities(data || [])
      setCitiesLoading(false)
    })
    // Fetch service types
    supabase.from('service_types').select('*').eq('is_active', true).then(({ data, error }) => {
      setServiceTypes(data || [])
      setServiceTypesLoading(false)
    })
    // Fetch duration types
    supabase.from('duration_types').select('*').eq('is_active', true).order('sort_order', { ascending: true }).then(({ data, error }) => {
      setDurationTypes(data || [])
      setDurationTypesLoading(false)
    })
    // Fetch user profile (to get city_id)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        // Fetch from profiles table using user.id
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        setUserProfile(profile);
        setUserCity(profile?.city_id || "");
        // Fetch agents only after getting city_id
        if (profile?.city_id) {
          setAgentsLoading(true);
          supabase
            .from('agents')
            .select('*')
            .eq('city_id', profile.city_id)
            .eq('status', 'approved')
            .eq('is_online', true)
            .then(({ data, error }) => {
              setAgents(data || []);
              setAgentsLoading(false);
            });
        } else {
          setAgents([]);
          setAgentsLoading(false);
        }
      } else {
        setUserProfile(null);
        setUserCity("");
        setAgents([]);
        setAgentsLoading(false);
      }
    });
  }, []);

  // Add local cache for categories and brands
  const categoriesCache = useRef<Category[] | null>(null);
  const brandsCache = useRef<{ [categoryId: string]: Brand[] } | null>(null);

  // Fetch categories with cache
  useEffect(() => {
    if (categoriesCache.current) {
      setCategories(categoriesCache.current);
      setCategoryLoading(false);
      return;
    }
    setCategoryLoading(true);
    supabase.from('categories').select('id, name').then(({ data, error }) => {
      if (data) {
        setCategories(data);
        categoriesCache.current = data;
      } else {
        setCategories([]);
      }
      setCategoryLoading(false);
    });
  }, []);

  // Fetch brands with cache
  useEffect(() => {
    if (!formData.category) {
      setBrands([]);
      return;
    }
    if (brandsCache.current && brandsCache.current[formData.category]) {
      setBrands(brandsCache.current[formData.category]);
      setBrandLoading(false);
      return;
    }
    setBrandLoading(true);
    supabase.from('brands').select('id, name, category_id').eq('category_id', formData.category).then(({ data, error }) => {
      if (data) {
        setBrands(data);
        if (!brandsCache.current) brandsCache.current = {};
        brandsCache.current[formData.category] = data;
      } else {
        setBrands([]);
      }
      setBrandLoading(false);
    });
  }, [formData.category]);

  // Fetch models/devices with precise columns and filters
  useEffect(() => {
    if (formData.category && formData.brand) {
      setModelsLoading(true);
      fetch(`/api/devices?category_id=${formData.category}&brand_id=${formData.brand}&select=id,model`).then(res => res.json()).then(data => {
        setModels(data.models || []);
        setModelsLoading(false);
      }).catch(() => {
        setModels([]);
        setModelsLoading(false);
      });
    } else {
      setModels([]);
    }
  }, [formData.category, formData.brand]);

  // Fetch deviceId when model is selected
  useEffect(() => {
    if (formData.category && formData.brand && formData.model) {
      // Fetch the deviceId for the selected model
      supabase
        .from('devices')
        .select('id')
        .eq('category_id', formData.category)
        .eq('brand_id', formData.brand)
        .eq('model', formData.model)
        .maybeSingle()
        .then(({ data }) => {
          setDeviceId(data?.id || "");
        });
    } else {
      setDeviceId("");
    }
  }, [formData.category, formData.brand, formData.model]);

  // Fetch faults with precise columns and error state
  const [faultsError, setFaultsError] = useState("");
  useEffect(() => {
    if (deviceId) {
      setFaultsLoading(true);
      setFaultsError("");
      supabase.from('faults').select('id, name, price').eq('device_id', deviceId).eq('is_active', true).then(({ data, error }) => {
        if (error) {
          setFaults([]);
          setFaultsError("Failed to load faults");
        } else {
          setFaults(data || []);
          setFaultsError("");
        }
        setFaultsLoading(false);
      });
    } else {
      setFaults([]);
      setFaultsError("");
    }
  }, [deviceId]);

  // Memoize filtered lists
  const memoizedModels = useMemo(() => models, [models]);
  const memoizedFaults = useMemo(() => faults, [faults]);

  // Filter agents when service type changes to local_dropoff
  useEffect(() => {
    if (formData.serviceType === "local_dropoff") {
      filterAgentsForLocalDropoff();
    } else {
      setFilteredAgents([]);
    }
  }, [formData.serviceType, formData.city_id, formData.address_latitude, formData.address_longitude]);

  // Selected faults state: array of Fault objects
  const [selectedFaults, setSelectedFaults] = useState<Fault[]>([]);

  // Handle fault checkbox toggle
  const handleFaultToggle = (fault: Fault) => {
    const exists = selectedFaults.some(f => f.id === fault.id);
    setSelectedFaults(exists
      ? selectedFaults.filter(f => f.id !== fault.id)
      : [...selectedFaults, fault]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (formData.images.length + files.length > 5) {
      toast({ title: "Error", description: "Maximum 5 images allowed", variant: "destructive" })
      return
    }
    // Upload images to Supabase Storage
    const uploadedUrls: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const filePath = `booking-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage.from('booking-images').upload(filePath, file)
      if (error) {
        toast({ title: "Error", description: `Failed to upload image: ${file.name}`, variant: "destructive" })
        continue
      }
      const { data: publicUrlData } = supabase.storage.from('booking-images').getPublicUrl(filePath)
      uploadedUrls.push(publicUrlData.publicUrl)
    }
    setFormData({ ...formData, images: [...formData.images, ...uploadedUrls] })
  }

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({ ...formData, images: newImages })
  }

  const getAvailableTimes = () => {
    const times = []
    for (let hour = 9; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, "0")}:00`)
      if (hour < 18) {
        times.push(`${hour.toString().padStart(2, "0")}:30`)
      }
    }
    return times
  }

  // Calculate total price: sum of selected faults + duration price
  const calculatePrice = () => {
    const faultsTotal = selectedFaults.reduce((sum, fault) => sum + (fault.price || 0), 0);
    const selectedDurationType = durationTypes.find(dt => dt.name === formData.duration);
    const durationPrice = selectedDurationType ? (selectedDurationType.extra_charge || 0) : 0;
    return faultsTotal + durationPrice;
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c; // Distance in kilometers
    const distanceMiles = distanceKm * 0.621371; // Convert to miles
    return distanceMiles;
  };

  // Filter and sort agents for Local Dropoff, Postal Service, and Collection & Delivery
  const filterAgentsForLocalDropoff = async () => {
    setAgentsLoading(true);
    setFilteredAgents([]);
    setFormData(f => ({ ...f, selectedAgent: "" }));
    if (!formData.city_id || !formData.address_latitude || !formData.address_longitude) {
      setAgentsLoading(false);
      return;
    }
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('city_id', formData.city_id)
        .eq('status', 'approved')
        .eq('is_online', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) {
        setFilteredAgents([]);
        setAgentsLoading(false);
        return;
      }
      const agentsWithDistance = (agents || []).map(agent => ({
        ...agent,
        distance: calculateDistance(
          formData.address_latitude!,
          formData.address_longitude!,
          agent.latitude,
          agent.longitude
        )
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setFilteredAgents(agentsWithDistance);
    } catch (error) {
      setFilteredAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Always trigger agent fetch on address/city change (even when navigating back)
  useEffect(() => {
    if (
      formData.serviceType === "local_dropoff" ||
      formData.serviceType === "postal" ||
      formData.serviceType === "collection_delivery"
    ) {
      filterAgentsForLocalDropoff();
    } else {
      setFilteredAgents([]);
      setFormData(f => ({ ...f, selectedAgent: "" }));
      setAgentsLoading(false);
    }
  }, [formData.serviceType, formData.city_id, formData.address_latitude, formData.address_longitude]);

  // Update handleSubmit to save selectedFaults in the booking
  const handleSubmit = async () => {
    console.log("🚀 Submitting booking:", { formData, selectedFaults, deviceId });
    setIsLoading(true);
    try {
      // Get the selected service type
      const selectedServiceType = serviceTypes.find(st => st.name === formData.serviceType);
      console.log("📋 Selected service type:", selectedServiceType);
      
      // Get the selected duration type
      const selectedDurationType = durationTypes.find(dt => dt.name === formData.duration);
      console.log("📋 Selected duration type:", selectedDurationType);
      
      // Prepare booking data with proper field mappings
      const bookingData = {
        ...formData,
        service_type_id: selectedServiceType?.id || null,
        duration_type_id: selectedDurationType?.id || null,
        agent_id: formData.selectedAgent || null,
        images: formData.images,
        device_id: deviceId,
        faults: selectedFaults.map(f => ({ id: f.id, name: f.name, price: f.price })),
        // Address fields
        address_street: formData.address_street || null,
        address_pincode: formData.address_pincode || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
        address_landmark: formData.address_landmark || null,
        address_latitude: formData.address_latitude || null,
        address_longitude: formData.address_longitude || null,
        location_type: formData.location_type || null,
        city_id: formData.city_id || null,
        // Dates/times
        collection_date: formData.collectionDate ? formData.collectionDate.toISOString().split('T')[0] : null,
        collection_time: formData.collectionTime || null,
        delivery_date: formData.deliveryDate ? formData.deliveryDate.toISOString().split('T')[0] : null,
        delivery_time: formData.deliveryTime || null,
        imei_number: formData.imei_number,
      };
      
      console.log("📤 Booking data to submit to API:", bookingData);
      
      // Submit booking to backend API route
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') {
        toast({ title: "Error", description: result?.message || "Booking failed.", variant: "destructive" });
        return;
      }
      const bookingId = result.booking_id || result.id;
      console.log("✅ Booking created successfully:", bookingId);
      toast({ title: "Success", description: `Repair booked successfully! Booking ID: ${bookingId}` });
      router.push(`/customer/book-repair/confirmation?bookingId=${bookingId}`);
      clearDraft();
    } catch (error: any) {
      console.error("❌ Booking submission failed:", error);
      toast({ title: "Error", description: error.message || "Failed to book repair. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      console.log("🏁 Booking submission completed");
    }
  };

  const nextStep = () => {
    const canProceedResult = canProceed();
    console.log("➡️ Next step clicked:", { currentStep, canProceed: canProceedResult });
    if (currentStep < steps.length && canProceedResult === true) {
      const next = currentStep + 1;
      setCurrentStep(next);
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
      console.log("✅ Moved to step:", next);
    } else {
      console.log("❌ Cannot proceed to next step");
    }
  }

  const prevStep = () => {
    console.log("⬅️ Previous step clicked:", { currentStep });
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
      console.log("✅ Moved to step:", prev);
    }
  }

  // Update canProceed function to use correct service type name
  const canProceed = () => {
    console.log("🔍 canProceed check:", {
      currentStep,
      formData: {
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        serviceType: formData.serviceType,
        selectedAgent: formData.selectedAgent,
        address: formData.address,
        pincode: formData.pincode,
        city_id: formData.city_id,
        collectionDate: formData.collectionDate,
        collectionTime: formData.collectionTime,
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        duration: formData.duration,
        paymentMethod: formData.paymentMethod,
        imei_number: formData.imei_number,
      },
      selectedFaultsLength: selectedFaults.length
    });

    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = Boolean(formData.category && formData.brand && formData.model && selectedFaults.length > 0 && formData.imei_number && /^\d{15}$/.test(formData.imei_number));
        return isValid;
      case 2:
        isValid = Boolean(
          formData.address_pincode &&
          formData.address_city &&
          formData.address_state &&
          formData.address_street &&
          formData.address_latitude &&
          formData.address_longitude
        );
        console.log("📋 Step 2 (location) validation:", { 
          pincode: Boolean(formData.address_pincode),
          city: Boolean(formData.address_city),
          state: Boolean(formData.address_state),
          street: Boolean(formData.address_street),
          latitude: Boolean(formData.address_latitude),
          longitude: Boolean(formData.address_longitude),
          isValid: isValid 
        });
        return isValid;
      case 3:
        if (formData.serviceType === "local_dropoff") {
          isValid = Boolean(formData.selectedAgent);
          return isValid;
        } else if (formData.serviceType === "collection_delivery") {
          isValid = Boolean(
            formData.selectedAgent &&
            formData.address_street &&
            formData.address_pincode &&
            formData.collectionDate !== undefined &&
            formData.collectionTime &&
            formData.deliveryDate !== undefined &&
            formData.deliveryTime
          );
          return isValid;
        } else if (formData.serviceType === "postal") {
          isValid = Boolean(formData.selectedAgent);
          return isValid;
        }
        console.log(" Step 2 validation: No service type selected");
        return false;
      case 4:
        isValid = Boolean(formData.duration);
        console.log("📋 Step 4 validation:", { 
          duration: Boolean(formData.duration),
          isValid: isValid 
        });
        return isValid;
      case 5:
        isValid = Boolean(formData.paymentMethod);
        console.log("📋 Step 5 validation:", { 
          paymentMethod: Boolean(formData.paymentMethod),
          isValid: isValid 
        });
        return isValid;
      default:
        console.log("📋 Unknown step validation");
        return false;
    }
  }

  const [postcodeError, setPostcodeError] = useState("");
  const [postcodeChecked, setPostcodeChecked] = useState(false);

  // Watch for changes to cityLat/cityLng (city center from API or city selection)
  useEffect(() => {
    if (
      formData.city_id &&
      cities.length > 0
    ) {
      const city = cities.find(c => c.id === formData.city_id);
      if (city && city.latitude && city.longitude) {
        // Move marker and recenter map
        setFormData(f => ({
          ...f,
          address_latitude: typeof city.latitude === 'number' ? city.latitude : null,
          address_longitude: typeof city.longitude === 'number' ? city.longitude : null,
          address_street: "", // Optionally clear street to avoid mismatch
        }));
        // Recenter the map if mapRef is available
        if (mapRef.current && typeof mapRef.current.flyTo === "function") {
          mapRef.current.flyTo({ center: [city.longitude, city.latitude], zoom: 14 });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.city_id, cities]);

  // Helper to check if a lat/lng is within bounds
  function isWithinBounds(lat: number, lng: number, bounds: [number, number, number, number]) {
    const [minLng, minLat, maxLng, maxLat] = bounds;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  // Helper to normalize postcode
  function normalizePostcode(value: string) {
    return value.replace(/\s+/g, '').toUpperCase().trim();
  }

  // Utility to check if a draft is valid (step 2+ or has location data)
  function isValidBookingDraft(draft: any) {
    if (!draft) return false;
    if (draft.currentStep && draft.currentStep >= 2) return true;
    if (
      draft.address_street ||
      draft.address_latitude ||
      draft.address_longitude ||
      draft.address_city ||
      draft.address_pincode
    ) {
      return true;
    }
    return false;
  }

  // On mount, only show banner for valid, non-expired drafts
  useEffect(() => {
    if (!userProfile?.id) return;
    const d = loadDraftForUser(userProfile.id);
    if (d && !isDraftExpired(d) && isValidBookingDraft(d)) {
      setShowDraftBanner(true);
      setDraft(d);
    } else {
      clearDraft();
    }
  }, [userProfile?.id]);

  // On every form/step update, save draft (except after submit)
  useEffect(() => {
    if (currentStep >= 2 && !isLoading && userProfile?.id) {
      debouncedSaveDraft({ ...formData, currentStep }, userProfile.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, currentStep, userProfile?.id]);

  // Add error state for agent fetching
  const [agentsError, setAgentsError] = useState<string>("");

  // Robust agent fetch for local dropoff and postal
  const fetchAgents = async () => {
    setAgentsLoading(true);
    setAgentsError("");
    setFilteredAgents([]);
    setFormData(f => ({ ...f, selectedAgent: "" }));
    console.log("[Agent Fetch] Triggered for:", {
      city_id: formData.city_id,
      address_latitude: formData.address_latitude,
      address_longitude: formData.address_longitude,
      address_pincode: formData.address_pincode
    });
    if (!formData.city_id || !formData.address_latitude || !formData.address_longitude) {
      setAgentsLoading(false);
      console.log("[Agent Fetch] Skipped: missing location info");
      return;
    }
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('city_id', formData.city_id)
        .eq('status', 'approved')
        .eq('is_online', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) {
        setFilteredAgents([]);
        setAgentsError("Something went wrong, please try again");
        setAgentsLoading(false);
        console.log("[Agent Fetch] Error:", error);
        return;
      }
      const agentsWithDistance = (agents || []).map(agent => ({
        ...agent,
        distance: calculateDistance(
          formData.address_latitude!,
          formData.address_longitude!,
          agent.latitude,
          agent.longitude
        )
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setFilteredAgents(agentsWithDistance);
      setAgentsError("");
      setAgentsLoading(false);
      console.log("[Agent Fetch] Success, count:", agentsWithDistance.length);
    } catch (error) {
      setFilteredAgents([]);
      setAgentsError("Something went wrong, please try again");
      setAgentsLoading(false);
      console.log("[Agent Fetch] Exception:", error);
    }
  };

  // Always trigger agent fetch on address/city/pincode change for local dropoff and postal
  useEffect(() => {
    if (formData.serviceType === "local_dropoff" || formData.serviceType === "postal") {
      fetchAgents();
    } else {
      setFilteredAgents([]);
      setFormData(f => ({ ...f, selectedAgent: "" }));
      setAgentsLoading(false);
      setAgentsError("");
    }
    // Debug: log current location state
    console.log("[Agent Fetch Effect] serviceType:", formData.serviceType, "city_id:", formData.city_id, "address_latitude:", formData.address_latitude, "address_longitude:", formData.address_longitude, "address_pincode:", formData.address_pincode);
  }, [formData.serviceType, formData.city_id, formData.address_latitude, formData.address_longitude, formData.address_pincode]);

  // Add hydration guard
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Book Device Repair</h1>
            <p className="text-muted-foreground">Get your device repaired by expert technicians</p>
          </div>
        </div>

        {/* Continue Booking Banner */}
        {showDraftBanner && (
          <div className="mb-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-primary/5 border border-primary/20 rounded-xl shadow-sm px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary w-10 h-10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3m-8 4v10a4 4 0 004 4h4" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-semibold text-primary text-base">Unfinished Booking Detected</div>
                    <div className="text-muted-foreground text-sm">
                      We've saved your unfinished booking. Continue or start over?
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="px-4"
                    onClick={() => {
                      setFormData(draft);
                      setCurrentStep(draft.currentStep || 1);
                      setShowDraftBanner(false);
                    }}
                  >
                    Continue Booking
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-4 border"
                    onClick={() => {
                      clearDraft();
                      setShowDraftBanner(false);
                      setFormData({
                        // ...reset to initial state
                        category: "",
                        brand: "",
                        model: "",
                        faults: [] as string[],
                        customFault: "",
                        images: [] as string[],
                        serviceType: "",
                        selectedAgent: "",
                        address: "",
                        pincode: "",
                        city_id: "",
                        collectionDate: undefined,
                        collectionTime: "",
                        deliveryDate: undefined,
                        deliveryTime: "",
                        duration: "",
                        promoCode: "",
                        paymentMethod: "",
                        newModel: "",
                        customModel: "",
                        address_pincode: "",
                        address_city: "",
                        address_state: "",
                        address_street: "",
                        address_landmark: "",
                        state_id: "",
                        address_latitude: null,
                        address_longitude: null,
                        address_full: "",
                        location_type: "residential",
                        imei_number: "",
                      });
                      setCurrentStep(1);
                    }}
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Device Details */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Device Category */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Device Category</Label>
                  <Select value={formData.category} onValueChange={val => setFormData(f => ({ ...f, category: val, model: "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={categoryLoading ? "Loading..." : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Selection */}
                {formData.category && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Brand</Label>
                    <Select
                      value={formData.brand}
                      onValueChange={(value) => setFormData({ ...formData, brand: value, model: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Model Selection */}
                {formData.category && formData.brand && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Model</Label>
                    <Select
                      value={formData.model}
                      onValueChange={val => setFormData(f => ({ ...f, model: val }))}
                      disabled={!formData.category || !formData.brand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsLoading ? (
                          <div>Loading models...</div>
                        ) : models.length === 0 ? (
                          <div>No models found.</div>
                        ) : (
                          models.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.model === "custom" && (
                  <Input
                    placeholder="Enter your device model"
                    value={formData.customModel || ""}
                    onChange={e => setFormData(f => ({ ...f, customModel: e.target.value }))}
                  />
                )}

                {/* Fault Selection (dynamic) */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    What's wrong with your device? (Select all that apply)
                  </Label>
                  {faultsLoading ? (
                    <div>Loading faults...</div>
                  ) : faults.length === 0 ? (
                    <div>No faults found for this device.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {faults.map((fault) => (
                        <div key={fault.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={fault.id}
                            checked={selectedFaults.some(f => f.id === fault.id)}
                            onCheckedChange={() => handleFaultToggle(fault)}
                          />
                          <Label htmlFor={fault.id} className="text-sm">
                            {fault.name} <span className="ml-2 text-muted-foreground">£{fault.price}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Fault (optional, unchanged) */}
                <div className="space-y-3">
                  <Label htmlFor="customFault">Additional Details (Optional)</Label>
                  <Textarea
                    id="customFault"
                    placeholder="Describe any additional issues or specific details..."
                    value={formData.customFault}
                    onChange={(e) => setFormData({ ...formData, customFault: e.target.value })}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Upload Images (Max 5)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <div className="flex text-sm text-muted-foreground">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                        >
                          <span>Upload images</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB each</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {formData.images.map((image: string, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* IMEI Number */}
                <div className="space-y-2">
                  <Label htmlFor="imei_number">IMEI Number</Label>
                  <Input
                    id="imei_number"
                    placeholder="Enter IMEI number"
                    value={formData.imei_number}
                    onChange={e => {
                      setFormData(f => ({ ...f, imei_number: e.target.value }));
                      setImeiError("");
                    }}
                    onBlur={e => {
                      const imeiValue = e.target.value;
                      if (!imeiValue) setImeiError("IMEI number is required.");
                      else if (!/^\d{15}$/.test(imeiValue)) setImeiError("IMEI must be a 15-digit number.");
                      else setImeiError("");
                    }}
                    maxLength={15}
                    inputMode="numeric"
                    required
                  />
                  {imeiError && <div className="text-red-600 text-sm mt-1">{imeiError}</div>}
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Location */}
            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Enter Your Address</Label>
                  {/* Postcode (address_pincode) */}
                    <div className="space-y-2">
                    <Label htmlFor="address_pincode">Postcode</Label>
                    <Input
                      id="address_pincode"
                      name="address_pincode"
                      value={formData.address_pincode || ""}
                      onChange={e => {
                        const raw = e.target.value;
                        const normalized = normalizePostcode(raw);
                        setFormData(f => ({ ...f, address_pincode: normalized }));
                        setPostcodeError("");
                        setPostcodeChecked(false);
                      }}
                      onBlur={e => {
                        const raw = e.target.value;
                        const value = normalizePostcode(raw);
                        if (!value) return;
                        // Check if postcode exists in any city
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
                          setFormData(f => ({
                          ...f, 
                            address_pincode: value,
                            address_city: foundCity.name,
                            address_state: foundState.name,
                            city_id: foundCity.id, // update city_id
                            state_id: foundState.id, // update state_id
                            // Reset marker and map to city center
                            address_latitude: typeof foundCity.latitude === 'number' ? foundCity.latitude : null,
                            address_longitude: typeof foundCity.longitude === 'number' ? foundCity.longitude : null,
                            address_street: "",
                          }));
                          setPostcodeError("");
                          setPostcodeChecked(true);
                          setLocationOutOfBounds(false);
                          if (mapRef.current && typeof mapRef.current.flyTo === "function" && typeof foundCity.longitude === 'number' && typeof foundCity.latitude === 'number') {
                            mapRef.current.flyTo({ center: [foundCity.longitude, foundCity.latitude], zoom: 14 });
                          }
                        } else {
                          setFormData(f => ({
                          ...f, 
                            address_city: "",
                            address_state: "",
                            city_id: "",
                            state_id: "",
                          }));
                          setPostcodeError("Service not available in this area.");
                          setPostcodeChecked(false);
                          setLocationOutOfBounds(false);
                        }
                      }}
                      placeholder="Enter your postcode"
                    />
                    {postcodeError && <div className="text-red-600 text-sm">{postcodeError}</div>}
                    </div>
                  {/* City (address_city) */}
                    <div className="space-y-2">
                    <Label htmlFor="address_city">City</Label>
                    <Input
                      id="address_city"
                      name="address_city"
                      value={formData.address_city || ""}
                      readOnly
                      placeholder="City will autofill"
                        />
                    </div>
                  {/* State (address_state) */}
                    <div className="space-y-2">
                    <Label htmlFor="address_state">State</Label>
                      <Input 
                      id="address_state"
                      name="address_state"
                      value={formData.address_state || ""}
                      readOnly
                      placeholder="State will autofill"
                      />
                    </div>
                  {/* Street (address_street) */}
                    <div className="space-y-2">
                    <Label htmlFor="address_street">Street</Label>
                      <Input 
                      id="address_street"
                      name="address_street"
                      value={formData.address_street || ""}
                      onChange={e => setFormData(f => ({ ...f, address_street: e.target.value }))}
                      placeholder="Street address"
                      />
                    </div>
                  {/* Landmark (address_landmark) */}
                  <div className="space-y-2">
                    <Label htmlFor="address_landmark">Landmark</Label>
                    <Input
                      id="address_landmark"
                      name="address_landmark"
                      value={formData.address_landmark || ""}
                      onChange={e => setFormData(f => ({ ...f, address_landmark: e.target.value }))}
                      placeholder="Near mall, park, etc."
                    />
                  </div>
                  {/* Hidden fields for city_id and state_id */}
                  <input type="hidden" name="city_id" value={formData.city_id || ""} />
                  <input type="hidden" name="state_id" value={formData.state_id || ""} />
                  {/* Latitude/Longitude fields (visible/map-managed) */}
                  {/* Full Address (address_full) - optional, visible or readonly */}
                  <div className="space-y-2">
                    <Label htmlFor="address_full">Full Address</Label>
                    <Input
                      id="address_full"
                      name="address_full"
                      value={formData.address_full || ""}
                      readOnly
                      placeholder="Full address will autofill or be composed"
                    />
                  </div>
                  {/* Location Type (location_type) */}
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <RadioGroup
                      value={formData.location_type || "residential"}
                      onValueChange={val => setFormData(f => ({ ...f, location_type: val }))}
                      className="flex flex-row gap-4"
                    >
                      <RadioGroupItem value="residential" id="location-type-home" />
                      <Label htmlFor="location-type-home">Home</Label>
                      <RadioGroupItem value="commercial" id="location-type-work" />
                      <Label htmlFor="location-type-work">Work</Label>
                      <RadioGroupItem value="other" id="location-type-other" />
                      <Label htmlFor="location-type-other">Other</Label>
                    </RadioGroup>
                  </div>
                  {/* Map section: always shown */}
                  <div className="space-y-2">
                    <Label>Drop a Pin on the Map</Label>
                  <Button 
                      type="button"
                      className="mb-2"
                    onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(async pos => {
                            const userLat = pos.coords.latitude;
                            const userLng = pos.coords.longitude;
                            // Always center the map and drop the pin
                            setFormData(f => ({
                              ...f,
                              address_latitude: typeof userLat === 'number' ? userLat : null,
                              address_longitude: typeof userLng === 'number' ? userLng : null,
                            }));
                            if (mapRef.current && typeof mapRef.current.flyTo === "function") {
                              mapRef.current.flyTo({ center: [userLng, userLat], zoom: 14 });
                            }
                            // Get current city bounds
                            const city = cities.find(c => c.id === formData.city_id);
                            let bounds: [number, number, number, number] = [0, 0, 0, 0];
                            if (city && city.latitude && city.longitude) {
                              bounds = [city.longitude - 0.1, city.latitude - 0.1, city.longitude + 0.1, city.latitude + 0.1];
                            }
                            if (isWithinBounds(userLat, userLng, bounds)) {
                              setLocationOutOfBounds(false);
                              // Reverse geocode
                              try {
                                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLng},${userLat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
                                const res = await fetch(url);
                                const data = await res.json();
                                let address = "";
                                let pincode = "";
                                if (data.features && data.features.length > 0) {
                                  address = data.features[0].place_name || "";
                                  for (const ctx of data.features[0].context || []) {
                                    if (ctx.id && ctx.id.startsWith("postcode")) {
                                      pincode = ctx.text;
                                      break;
                                    }
                                  }
                                }
                                setFormData(f => ({ ...f, address_street: address, address_pincode: pincode }));
                                setPostcodeError("");
                                setPostcodeChecked(true);
                              } catch {
                                setFormData(f => ({ ...f, address_street: "", address_pincode: "" }));
                                setPostcodeError("Could not reverse geocode your location.");
                                setPostcodeChecked(false);
                              }
                      } else {
                              setLocationOutOfBounds(true);
                        toast({ 
                                title: "Location outside service area",
                                description: "Sorry, we do not provide service to this location.",
                          variant: "destructive" 
                              });
                              setPostcodeChecked(false);
                            }
                        });
                      }
                    }}
                    >
                      Use My Location
                    </Button>
                    {locationOutOfBounds && (
                      <div className="text-red-600 text-sm mb-2">Sorry, we do not provide service to your current location.</div>
                    )}
                    <div className="w-full" style={{ height: 400, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--muted)' }}>
                      <MapboxPinDrop
                        ref={mapRef}
                        lat={formData.address_latitude || null}
                        lng={formData.address_longitude || null}
                        onPinDrop={(lat, lng) => setFormData(f => ({
                          ...f,
                          address_latitude: typeof lat === 'number' ? lat : null,
                          address_longitude: typeof lng === 'number' ? lng : null,
                        }))}
                        center={(() => {
                          if (formData.address_latitude && formData.address_longitude) {
                            return [formData.address_longitude, formData.address_latitude];
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
                        mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
                        style={{ width: '100%', height: 400, borderRadius: 8 }}
                        onReverseGeocode={(address, pincode) => setFormData(f => ({ ...f, address_street: address, address_pincode: pincode }))}
                      />
                    </div>
                  </div>
                  {/* Next Button */}
                  <Button
                    className="w-full mt-4"
                    onClick={nextStep}
                    disabled={
                      !postcodeChecked || !formData.address_street || !formData.address_latitude || !formData.address_longitude || locationOutOfBounds
                    }
                  >
                    Confirm Address
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Service Type */}
            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Service Type Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Choose Service Type</Label>
                  <RadioGroup
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                  >
                    <div className="space-y-4">
                      {serviceTypesLoading ? (
                        <div>Loading service types...</div>
                      ) : serviceTypes.length === 0 ? (
                        <div>No service types available.</div>
                      ) : (
                        // Sort service types in the correct order
                        serviceTypes
                          .sort((a, b) => {
                            const order = { local_dropoff: 1, collection_delivery: 2, postal: 3 };
                            return (order[a.name as keyof typeof order] || 999) - (order[b.name as keyof typeof order] || 999);
                          })
                          .map((serviceType) => (
                            <div key={serviceType.id}>
                              <div
                                className={`border rounded-lg p-4 ${formData.serviceType === serviceType.name ? "border-primary bg-primary/5" : "border-muted"}`}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value={serviceType.name} id={serviceType.name} />
                                  <Label htmlFor={serviceType.name} className="font-medium">
                                    {serviceType.label}
                                  </Label>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {serviceType.description}
                                </p>
                              </div>
                              
                              {/* Conditional UI blocks for each service type */}
                              {formData.serviceType === serviceType.name && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="mt-4"
                                >
                                  {/* Local Dropoff - Agent Selection */}
                                  {serviceType.name === "local_dropoff" && (
                                    <div className="space-y-4">
                                      {/* Enhanced Location Summary */}
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Your Dropoff Location</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">🏛️ State:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {states.find(s => s.id === formData.state_id)?.name || 'Not selected'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">🏙️ City:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {cities.find(c => c.id === formData.city_id)?.name || 'Not selected'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 md:col-span-2">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">📍 Street:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formData.address_street || 'Not set'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">📮 Pincode:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formData.address_pincode || 'Not set'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">🎯 Coordinates:</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                                              {formData.address_latitude?.toFixed(6)}, {formData.address_longitude?.toFixed(6)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Agent Selection */}
                                      <div className="space-y-4">
                                        <Label className="text-base font-medium">Select a Repair Agent</Label>
                                        
                                        {agentsLoading ? (
                                          <div className="flex items-center justify-center py-8">
                                            <div className="text-muted-foreground">Loading available agents...</div>
                                          </div>
                                        ) : agentsError ? (
                                          <div className="border rounded p-6 text-center">
                                            <div className="text-muted-foreground mb-2">Something went wrong, please try again</div>
                                          </div>
                                        ) : filteredAgents.length === 0 ? (
                                          <div className="border rounded p-6 text-center">
                                            <div className="text-muted-foreground mb-2">No agents are currently available in the selected city. Please try again later or choose a different service type.</div>
                                          </div>
                                        ) : (
                                          <RadioGroup
                                            value={formData.selectedAgent}
                                            onValueChange={(value) => setFormData({ ...formData, selectedAgent: value })}
                                          >
                                            <div className="space-y-3">
                                              {filteredAgents.map((agent) => (
                                                <div
                                                  key={agent.id}
                                                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                    formData.selectedAgent === agent.id
                                                      ? "border-primary bg-primary/5"
                                                      : "border-muted hover:border-muted-foreground/50"
                                                  }`}
                                                  onClick={() => setFormData({ ...formData, selectedAgent: agent.id })}
                                                >
                                                  <div className="flex items-center space-x-3">
                                                    <RadioGroupItem value={agent.id} id={agent.id} />
                                                    <div className="flex-1">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-lg">{agent.shop_name}</h3>
                                                        <Badge variant="secondary" className="text-xs">
                                                          {agent.distance?.toFixed(2)} miles away
                                                        </Badge>
                                                      </div>
                                                      
                                                      <div className="space-y-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                          <span>👨</span>
                                                          <span>{agent.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <span>📍</span>
                                                          <span>{agent.shop_address_street}, {agent.shop_address_pincode}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <span>📞</span>
                                                          <span>{agent.phone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <span>⭐</span>
                                                          <span>
                                                            {agent.rating_average?.toFixed(1) || 'N/A'} ★ 
                                                            ({agent.rating_count || 0} reviews)
                                                          </span>
                                                        </div>
                                                        {agent.completed_jobs && (
                                                          <div className="flex items-center gap-1">
                                                            <span>📊</span>
                                                            <span>{agent.completed_jobs} completed repairs</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </RadioGroup>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Collection & Delivery - Address Display */}
                                  {serviceType.name === "collection_delivery" && (
                                    <div className="space-y-4">
                                      <Label className="text-base font-medium">Collection & Delivery Address</Label>
                                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                                          <h3 className="font-semibold text-green-900 dark:text-green-100">Your Collection Address</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="text-green-600 dark:text-green-400 font-medium">🏛️ State:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {states.find(s => s.id === formData.state_id)?.name || 'Not selected'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-green-600 dark:text-green-400 font-medium">🏙️ City:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {cities.find(c => c.id === formData.city_id)?.name || 'Not selected'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 md:col-span-2">
                                            <span className="text-green-600 dark:text-green-400 font-medium">📍 Street:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formData.address_street || 'Not set'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-green-600 dark:text-green-400 font-medium">📮 Pincode:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formData.address_pincode || 'Not set'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-green-600 dark:text-green-400 font-medium">🎯 Coordinates:</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                                              {formData.address_latitude?.toFixed(6)}, {formData.address_longitude?.toFixed(6)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Collection Date & Time */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Collection Date</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.collectionDate ? format(formData.collectionDate, "PPP") : "Pick a date"}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                mode="single"
                                                selected={formData.collectionDate}
                                                onSelect={(date) => setFormData({ ...formData, collectionDate: date })}
                                                disabled={(date) => {
                                                  if (!minDate || !maxDate) return true;
                                                  return date < minDate || date > maxDate;
                                                }}
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="collectionTime">Collection Time</Label>
                                          <Select
                                            value={formData.collectionTime}
                                            onValueChange={(value) => setFormData({ ...formData, collectionTime: value })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {getAvailableTimes().map((time) => (
                                                <SelectItem key={time} value={time}>
                                                  {time}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Postal Service - Address Display */}
                                  {serviceType.name === "postal" && (
                                    <div className="space-y-4">
                                      <Label className="text-base font-medium">Postal Address</Label>
                                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                          <h3 className="font-semibold text-purple-900 dark:text-purple-100">Your Postal Address</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="text-purple-600 dark:text-purple-400 font-medium">🏛️ State:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {states.find(s => s.id === formData.state_id)?.name || 'Not selected'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-purple-600 dark:text-purple-400 font-medium">🏙️ City:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {cities.find(c => c.id === formData.city_id)?.name || 'Not selected'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 md:col-span-2">
                                            <span className="text-purple-600 dark:text-purple-400 font-medium">📍 Street:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formData.address_street || 'Not set'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-purple-600 dark:text-purple-400 font-medium">📮 Pincode:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formData.address_pincode || 'Not set'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-purple-600 dark:text-purple-400 font-medium">🎯 Coordinates:</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                                              {formData.address_latitude?.toFixed(6)}, {formData.address_longitude?.toFixed(6)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                                        <div className="flex items-start gap-3">
                                          <div className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</div>
                                          <div>
                                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                                              How it works
                                            </p>
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                              Send your device securely to a trusted repair agent in your city. Choose your preferred agent, ship your device, and receive updates until your device is repaired and returned.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Agent Selection (same as Local Dropoff) */}
                                      <div className="space-y-4">
                                        <Label className="text-base font-medium">Select a Repair Agent</Label>
                                        {agentsLoading ? (
                                          <div className="flex items-center justify-center py-8">
                                            <div className="text-muted-foreground">Loading available agents...</div>
                                          </div>
                                        ) : agentsError ? (
                                          <div className="border rounded p-6 text-center">
                                            <div className="text-muted-foreground mb-2">Something went wrong, please try again</div>
                                          </div>
                                        ) : filteredAgents.length === 0 ? (
                                          <div className="border rounded p-6 text-center">
                                            <div className="text-muted-foreground mb-2">No agents are currently available in the selected city. Please try again later or choose a different service type.</div>
                                          </div>
                                        ) :
                                          <RadioGroup
                                            value={formData.selectedAgent}
                                            onValueChange={(value) => setFormData({ ...formData, selectedAgent: value })}
                                          >
                                            <div className="space-y-3">
                                              {filteredAgents.map((agent) => (
                                                <div
                                                  key={agent.id}
                                                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                    formData.selectedAgent === agent.id
                                                      ? "border-primary bg-primary/5"
                                                      : "border-muted hover:border-muted-foreground/50"
                                                  }`}
                                                  onClick={() => setFormData({ ...formData, selectedAgent: agent.id })}
                                                >
                                                  <div className="flex items-center space-x-3">
                                                    <RadioGroupItem value={agent.id} id={agent.id} />
                                                    <div className="flex-1">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-lg">{agent.shop_name}</h3>
                                                        <Badge variant="secondary" className="text-xs">
                                                          {agent.distance?.toFixed(2)} miles away
                                                        </Badge>
                                                      </div>
                                                      <div className="space-y-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                          <span>👨</span>
                                                          <span>{agent.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <span>📍</span>
                                                          <span>{agent.shop_address_street}, {agent.shop_address_pincode}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <span>📞</span>
                                                          <span>{agent.phone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <span>⭐</span>
                                                          <span>
                                                            {agent.rating_average?.toFixed(1) || 'N/A'} ★ 
                                                            ({agent.rating_count || 0} reviews)
                                                          </span>
                                                        </div>
                                                        {agent.completed_jobs && (
                                                          <div className="flex items-center gap-1">
                                                            <span>📊</span>
                                                            <span>{agent.completed_jobs} completed repairs</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </RadioGroup>
                                        }
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </RadioGroup>
                </div>
              </motion.div>
            )}

            {/* Step 4: Duration & Summary */}
            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Duration Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Repair Duration</Label>
                  <RadioGroup
                    value={formData.duration}
                    onValueChange={(value) => {
                      setFormData({ ...formData, duration: value });
                      setDurationError("");
                    }}
                  >
                    <div className="space-y-4">
                      {durationTypesLoading ? (
                        <div>Loading duration options...</div>
                      ) : durationTypes.length === 0 ? (
                        <div>No duration options available.</div>
                      ) : (
                        durationTypes.map((durationType) => (
                          <div
                            key={durationType.id}
                            className={`border rounded-lg p-4 ${formData.duration === durationType.name ? "border-primary bg-primary/5" : "border-muted"}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={durationType.name} id={durationType.name} />
                                <div>
                                  <Label htmlFor={durationType.name} className="font-medium">
                                    {durationType.label}
                                  </Label>
                                  <p className="text-sm text-muted-foreground">{durationType.description}</p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {durationType.extra_charge > 0 ? `+£${durationType.extra_charge}` : 'Base Price'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </RadioGroup>
                  {durationError && <div className="text-red-600 text-sm mt-2">{durationError}</div>}
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promoCode"
                      placeholder="Enter promo code"
                      value={formData.promoCode}
                      onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                    />
                    <Button variant="outline">Apply</Button>
                  </div>
                </div>

                {/* Summary */}
                <div className="border rounded-lg p-6 bg-muted/50">
                  <h3 className="font-semibold mb-4">Booking Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Device:</span>
                      <span className="font-medium">
                        {brands.find(b => b.id === formData.brand)?.name || formData.brand} {formData.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Issues:</span>
                      <span className="font-medium">{selectedFaults.map(f => f.name).join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Type:</span>
                      <span className="font-medium capitalize">{formData.serviceType?.replace("-", " ")}</span>
                    </div>
                    {formData.selectedAgent && (
                      <div className="flex justify-between">
                        <span>Repair Center:</span>
                        <span className="font-medium">
                          {filteredAgents.find((a) => a.id === formData.selectedAgent)?.shop_name || 
                           agents.find((a) => a.id === formData.selectedAgent)?.name || 
                           'Selected Agent'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium capitalize">{formData.duration}</span>
                    </div>
                    {/* Faults Total */}
                    <div className="flex justify-between">
                      <span>Faults Total:</span>
                      <span>{formatGBP(selectedFaults.reduce((sum, fault) => sum + (fault.price || 0), 0))}</span>
                    </div>
                    {/* Duration Price */}
                    {(() => {
                      const selectedDurationType = durationTypes.find(dt => dt.name === formData.duration);
                      if (!selectedDurationType) return null;
                      return (
                        <div className="flex justify-between">
                          <span>Duration Price:</span>
                          <span>{selectedDurationType.label} ({formatGBP(selectedDurationType.extra_charge || 0)})</span>
                        </div>
                      );
                    })()}
                    {/* Total Amount */}
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span>{formatGBP(calculatePrice())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Payment Method</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <div className="space-y-4">
                      <div
                        className={`border rounded-lg p-4 ${formData.paymentMethod === "stripe" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="stripe" id="stripe" />
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <Label htmlFor="stripe" className="font-medium">
                              Pay Online (Stripe)
                            </Label>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Secure payment with credit/debit card</p>
                      </div>

                      <div
                        className={`border rounded-lg p-4 ${formData.paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cash" id="cash" />
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            <Label htmlFor="cash" className="font-medium">
                              Cash on Service
                            </Label>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Pay when your device is ready</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Final Summary */}
                <div className="border rounded-lg p-6 bg-primary/5">
                  <h3 className="font-semibold mb-4">Final Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Device:</span>
                      <span>
                        {brands.find(b => b.id === formData.brand)?.name || formData.brand} {formData.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span className="capitalize">{formData.serviceType?.replace("-", " ")}</span>
                    </div>
                    {formData.selectedAgent && (
                      <div className="flex justify-between">
                        <span>Agent:</span>
                        <span>
                          {filteredAgents.find((a) => a.id === formData.selectedAgent)?.shop_name || 
                           agents.find((a) => a.id === formData.selectedAgent)?.name || 
                           'Selected Agent'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="capitalize">{formData.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span>{formData.paymentMethod === "stripe" ? "Online Payment" : "Cash on Service"}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatGBP(calculatePrice())}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Debug info */}
        {(() => {
          const canProceedResult = canProceed();
          console.log("🎯 Navigation buttons render - canProceed:", canProceedResult, "currentStep:", currentStep);
          return null;
        })()}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button 
              onClick={() => {
                if (currentStep === 4 && !formData.duration) {
                  setDurationError("Please select a repair duration to continue.");
                  return;
                }
                console.log("🔘 Next button clicked - canProceed result:", canProceed());
                nextStep();
              }} 
              disabled={!canProceed() || locationOutOfBounds}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || isLoading}>
              {isLoading ? "Booking..." : "Confirm Booking"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
