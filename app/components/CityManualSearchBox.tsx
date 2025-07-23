"use client";
import React, { useState } from "react";

interface CityManualSearchBoxProps {
  onSelect: (name: string, lat: number, lng: number) => void;
  placeholder?: string;
  accessToken: string;
}

const CityManualSearchBox: React.FC<CityManualSearchBoxProps> = ({ onSelect, placeholder, accessToken }) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setSuggestions([]);
    setShowDropdown(false);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(inputValue)}.json?access_token=${accessToken}&types=place&autocomplete=true&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setSuggestions(data.features);
        setShowDropdown(true);
      } else {
        setError("No results found.");
      }
    } catch (err) {
      setError("Failed to fetch suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (feature: any) => {
    const name = feature.text || feature.place_name || "";
    let lat: number | null = null;
    let lng: number | null = null;
    if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
      [lng, lat] = feature.geometry.coordinates;
      if (typeof lat !== "number" || typeof lng !== "number") {
        lat = null;
        lng = null;
      }
    }
    setInputValue(name);
    setShowDropdown(false);
    setSuggestions([]);
    if (name && lat !== null && lng !== null) {
      onSelect(name, lat, lng);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <input
          type="text"
          className="w-full border rounded p-2"
          placeholder={placeholder || "Type a city name"}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onFocus={() => setShowDropdown(false)}
        />
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleSearch}
          disabled={loading || !inputValue.trim()}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 bg-gray-900 border border-gray-700 rounded shadow z-[200] mt-1 max-h-60 overflow-auto text-white">
          {suggestions.map((feature, idx) => (
            <div
              key={feature.id}
              className="p-2 hover:bg-blue-700 cursor-pointer"
              onClick={() => handleSelect(feature)}
            >
              <div className="font-medium text-white">{feature.text}</div>
              <div className="text-xs text-gray-300">{feature.place_name}</div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
};

export default CityManualSearchBox; 