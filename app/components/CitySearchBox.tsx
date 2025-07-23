"use client";
import { SearchBox } from '@mapbox/search-js-react';
import React, { useRef, useEffect, useState } from 'react';

interface CitySearchBoxProps {
  onSelect: (name: string, lat: number, lng: number) => void;
  placeholder?: string;
  accessToken: string;
  options?: any;
}

const CitySearchBox: React.FC<CitySearchBoxProps> = ({ onSelect, placeholder, accessToken, options }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.mapboxgl-ctrl-geocoder--input');
      if (input) {
        inputRef.current = input;
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const handleRetrieve = (res: any) => {
    const feature = res?.features?.[0];
    if (!feature) return;
    console.log('Selected feature:', feature);
    const name = feature.text || feature.place_name || '';
    let lat: number | null = null;
    let lng: number | null = null;
    if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
      [lng, lat] = feature.geometry.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        lat = null;
        lng = null;
      }
    }
    if (name && lat !== null && lng !== null) {
      setTimeout(() => setInputValue(name), 0); // Defer update to after Mapbox logic
      onSelect(name, lat, lng);
    }
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
  };

  return (
    <div
      className="relative z-[100] bg-white p-2 border rounded pointer-events-auto"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .mapboxgl-ctrl-geocoder--suggestion {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
        .mapboxgl-ctrl-geocoder--suggestions {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
      `}</style>
      {/* @ts-ignore */}
      <SearchBox
        accessToken={accessToken}
        options={options}
        onRetrieve={handleRetrieve}
        placeholder={placeholder || "Search for a city"}
        value={inputValue}
        onChange={handleInputChange}
      />
    </div>
  );
};

export default CitySearchBox; 