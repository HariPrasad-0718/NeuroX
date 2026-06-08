"use client";

import { useState } from "react";
import { ChevronDown, ArrowRight, X } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useExperts } from "@/hooks/useExperts";
import { api } from "@/services/api";

export default function ExpertsPage() {
  const [selectedFilter, setSelectedFilter] = useState("All Skills");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [bookingPopup, setBookingPopup] = useState({ isOpen: false, expert: null });
  const [bookingForm, setBookingForm] = useState({ date: "", timeSlot: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { experts, isLoading, error, refetch } = useExperts();

  const availableTimeSlots = ["09:00:00", "10:00:00", "11:00:00", "12:00:00", "13:00:00", "14:00:00", "15:00:00", "16:00:00", "17:00:00", "18:00:00"];
  const allSkills = Array.from(new Set(experts.flatMap((e) => e.skills))).sort();
  const filteredExperts = selectedFilter === "All Skills" ? experts : experts.filter((e) => e.skills.includes(selectedFilter));

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingPopup.expert?.apiData?.expertId) return;
    setIsSubmitting(true);
    try {
      const response = await api.createBooking({ expertId: bookingPopup.expert.apiData.expertId, bookingDateTime: `${bookingForm.date}T${bookingForm.timeSlot}Z`, description: bookingForm.description }, "u");
      if (response.success) {
        setBookingPopup({ isOpen: false, expert: null });
        setBookingForm({ date: "", timeSlot: "", description: "" });
        alert("Booking created successfully!");
      }
    } catch (err) {
      alert("Failed to create booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (t) => { if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`; };

  return (
    <div className="flex-1 bg-[#fafafa]">
      <div className="px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900">Connect With Design Thinking Experts</h1>
        <p className="text-sm text-gray-600 mt-1">{isLoading ? "Loading experts..." : `${experts.length} experts available`}</p>
      </div>
      <div className="px-8 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter:</span>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsDropdownOpen(!isDropdownOpen)} disabled={isLoading}>{selectedFilter}<ChevronDown className="w-4 h-4 text-gray-500" /></button>
            {isDropdownOpen && (
              <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left" onClick={() => { setSelectedFilter("All Skills"); setIsDropdownOpen(false); }}>All Skills</button>
                {allSkills.map((skill) => (<button key={skill} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left" onClick={() => { setSelectedFilter(skill); setIsDropdownOpen(false); }}>{skill}</button>))}
              </div>
            )}
          </div>
        </div>
      </div>
      {isLoading && <div className="px-8 pb-8 flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#702dff] mb-4" /><p className="text-gray-600">Loading experts...</p></div>}
      {error && !isLoading && <div className="px-8 pb-8"><div className="bg-red-50 border border-red-200 rounded-lg p-6"><p className="text-red-700 font-medium">Error Loading Experts</p><p className="text-red-600 text-sm">{error}</p><button onClick={refetch} className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">Try Again</button></div></div>}
      {!isLoading && !error && (
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredExperts.map((expert) => (
              <div key={expert.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className={`h-32 bg-gradient-to-r ${expert.gradient} flex items-end justify-center pb-4 relative`}>
                  <div className="absolute -bottom-10 w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl">
                    <ImageWithFallback src={expert.image} alt={expert.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="p-5 pt-14 text-center">
                  <h3 className="font-semibold text-gray-900 mb-1.5">{expert.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">{expert.experience}</p>
                  <div className="flex flex-wrap gap-2 mb-5 justify-center">
                    {expert.skills.map((skill, i) => (<span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">{skill}</span>))}
                  </div>
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#702dff] text-white rounded-lg hover:bg-[#5a24cc] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => setBookingPopup({ isOpen: true, expert })}
                    disabled={!expert.apiData?.expertId}
                  >
                    <span className="text-sm">{expert.apiData?.expertId ? "Book a Session" : "Demo Profile"}</span><ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bookingPopup.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Book a Session</h2>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => { setBookingPopup({ isOpen: false, expert: null }); setBookingForm({ date: "", timeSlot: "", description: "" }); }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-6">Book with <span className="font-semibold text-gray-900">{bookingPopup.expert?.name}</span></p>
            <form onSubmit={handleBookingSubmit}>
              <div className="mb-5"><label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label><input type="date" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#702dff]" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} required min={new Date().toISOString().split("T")[0]} /></div>
              <div className="mb-5"><label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label><select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#702dff]" value={bookingForm.timeSlot} onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })} required><option value="">Select time</option>{availableTimeSlots.map((s) => (<option key={s} value={s}>{formatTime(s)}</option>))}</select></div>
              <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">Description</label><textarea rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#702dff]" placeholder="What would you like to discuss?" value={bookingForm.description} onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })} required /></div>
              <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#702dff] text-white rounded-lg hover:bg-[#5a24cc] disabled:opacity-50">
                {isSubmitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Booking...</>) : (<><span className="text-sm">Confirm Booking</span><ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
