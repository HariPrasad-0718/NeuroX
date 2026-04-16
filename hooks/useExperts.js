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

export function useExperts() {
  const [experts, setExperts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExperts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getExperts();

      if (response.success && response.data) {
        const mapped = response.data.map((expert, index) => ({
          id: expert.expertId,
          name: expert.name,
          experience: `${expert.yearsOfExperience || 15} Years of Experience`,
          skills: expert.skills?.length > 0 ? expert.skills : ["UX", "Design"],
          image: IMAGES[index % IMAGES.length],
          gradient: GRADIENTS[index % GRADIENTS.length],
          apiData: expert,
          isRealData: true,
        }));
        setExperts(mapped);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperts();
  }, []);

  return { experts, isLoading, error, refetch: fetchExperts };
}
