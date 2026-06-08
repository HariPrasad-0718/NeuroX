"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";

const GRADIENTS = [
  "from-[#8B5CF6] to-[#A78BFA]",
  "from-[#6366F1] to-[#818CF8]",
  "from-[#8B5CF6] to-[#A78BFA]",
  "from-[#6366F1] to-[#818CF8]",
];

const IMAGES = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
];

const DEMO_EXPERTS = [
  {
    expertId: "demo-1",
    name: "Sarah Johnson",
    yearsOfExperience: 12,
    skills: ["UX Research", "Service Design", "Journey Mapping"],
  },
  {
    expertId: "demo-2",
    name: "Michael Chen",
    yearsOfExperience: 9,
    skills: ["Product Strategy", "Design Thinking", "Workshop Facilitation"],
  },
  {
    expertId: "demo-3",
    name: "Emily Rodriguez",
    yearsOfExperience: 11,
    skills: ["Rapid Prototyping", "Usability Testing", "Interaction Design"],
  },
  {
    expertId: "demo-4",
    name: "Daniel Kim",
    yearsOfExperience: 14,
    skills: ["Enterprise UX", "Information Architecture", "Design Systems"],
  },
];

function mapExperts(rawExperts, isDemoData = false) {
  return rawExperts.map((expert, index) => ({
    id: expert.expertId,
    name: expert.name,
    experience: `${expert.yearsOfExperience || 15} Years of Experience`,
    skills: expert.skills?.length > 0 ? expert.skills : ["UX", "Design"],
    image: IMAGES[index % IMAGES.length],
    gradient: GRADIENTS[index % GRADIENTS.length],
    apiData: isDemoData ? null : expert,
    isRealData: !isDemoData,
  }));
}

export function useExperts() {
  const [experts, setExperts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExperts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getExperts();

      const apiExperts = response?.success && Array.isArray(response.data) ? response.data : [];

      if (apiExperts.length > 0) {
        setExperts(mapExperts(apiExperts));
        return;
      }

      // Keep the screen demo-friendly even when backend has no experts yet.
      setExperts(mapExperts(DEMO_EXPERTS, true));
    } catch (err) {
      setExperts(mapExperts(DEMO_EXPERTS, true));
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperts();
  }, []);

  return { experts, isLoading, error, refetch: fetchExperts };
}
