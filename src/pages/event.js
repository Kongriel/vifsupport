import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "/lib/supabaseClient";
import { useRouter } from "next/router";
import Head from "next/head";

export default function EventPage() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [daysUntilNextEvent, setDaysUntilNextEvent] = useState(0);
  const [targetDays, setTargetDays] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = () => {
      const status = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(status);
    };

    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const { data: tablesData, error: tablesError } = await supabase.rpc("get_public_tables");
        if (tablesError) throw tablesError;

        const opgaveTables = tablesData.map((table) => table.tablename).filter((name) => name.startsWith("opgaver"));

        let selectedEvents = [];
        for (const table of opgaveTables) {
          const { data: eventsData, error: eventsError } = await supabase.from(table).select("id, friendly_name, event_date, image_url, event_description, event_longdescription, slug, ishidden, address").order("event_date", { ascending: true }).limit(1); // Henter kun den første række pr. tabel

          if (eventsError) throw eventsError;

          if (eventsData && eventsData.length > 0) {
            selectedEvents.push({ ...eventsData[0], table_name: table });
          }
        }

        selectedEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

        const today = new Date();
        const upcomingEvent = selectedEvents.find((event) => new Date(event.event_date) >= today);

        if (upcomingEvent) {
          const eventDate = new Date(upcomingEvent.event_date);
          const difference = eventDate - today;
          const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
          setTargetDays(days);
        }

        setEvents(selectedEvents);
      } catch (err) {
        console.error("Fejl ved hentning af events:", err);
        setError("Kunne ikke hente events.");
      } finally {
        setIsLoading(false); // Stop loading state
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length === 0) return;

    // Filtrér skjulte events fra og find den næste dato blandt synlige events
    const visibleEvents = events.filter((event) => !event.ishidden);
    const upcomingDates = visibleEvents.map((event) => new Date(event.event_date)).filter((date) => date >= new Date());
    const nextEventDate = upcomingDates.length > 0 ? Math.min(...upcomingDates) : null;

    if (!nextEventDate) return;

    const targetDays = Math.ceil((nextEventDate - new Date()) / (1000 * 60 * 60 * 24));

    const interval = setInterval(() => {
      setDaysUntilNextEvent((prev) => {
        if (prev < targetDays) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 18);

    return () => clearInterval(interval);
  }, [events]);

  const toggleVisibility = async (event) => {
    try {
      const newVisibility = !event.ishidden;
      const { error } = await supabase.from(event.table_name).update({ ishidden: newVisibility }).eq("slug", event.slug);

      if (error) throw error;

      setEvents((prevEvents) => prevEvents.map((e) => (e.slug === event.slug ? { ...e, ishidden: newVisibility } : e)));

      alert(`Eventet "${event.friendly_name}" blev ${newVisibility ? "skjult" : "offentliggjort"}.`);
    } catch (err) {
      console.error("Fejl ved opdatering af synlighed:", err);
      alert("Kunne ikke opdatere synlighed. Prøv igen.");
    }
  };

  const handleDeleteEvent = async (event) => {
    const tableSuffix = event.table_name.replace("opgaver", "");
    const timeSlotTable = `time_slots${tableSuffix}`;
    const volunteerTable = `tilmeldte${tableSuffix}`;
    const confirmDelete = window.confirm(`Er du sikker på, at du vil slette eventet "${event.friendly_name}" og alle relaterede tabeller?`);

    if (!confirmDelete) return;

    try {
      const deleteElement = document.getElementById(`event-${event.slug}`);
      if (deleteElement) {
        // Start sletteanimationen
        deleteElement.classList.add("light-speed");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // DROP de relaterede tabeller
      const { error: dropVolunteerTableError } = await supabase.rpc("run_raw_sql", {
        sql: `DROP TABLE IF EXISTS ${volunteerTable};`,
      });
      if (dropVolunteerTableError) throw new Error(`Fejl ved sletning af volunteer-tabel: ${dropVolunteerTableError.message}`);

      const { error: dropTimeSlotTableError } = await supabase.rpc("run_raw_sql", {
        sql: `DROP TABLE IF EXISTS ${timeSlotTable};`,
      });
      if (dropTimeSlotTableError) throw new Error(`Fejl ved sletning af time-slot-tabel: ${dropTimeSlotTableError.message}`);

      const { error: dropEventTableError } = await supabase.rpc("run_raw_sql", {
        sql: `DROP TABLE IF EXISTS ${event.table_name};`,
      });
      if (dropEventTableError) throw new Error(`Fejl ved sletning af event-tabel: ${dropEventTableError.message}`);

      // Fjern eventet fra UI
      setEvents((prevEvents) => prevEvents.filter((e) => e.slug !== event.slug));
      alert(`Eventet "${event.friendly_name}" og dets relaterede tabeller blev slettet.`);
    } catch (err) {
      console.error("Fejl ved sletning af event:", err.message);
      alert("Kunne ikke slette eventet og dets relaterede data. Prøv igen.");
    }
  };

  const handleEditEvent = (event) => {
    const params = new URLSearchParams(
      Object.entries({
        id: event.id,
        friendly_name: event.friendly_name,
        event_date: event.event_date,
        image_url: event.image_url,
        event_description: event.event_description,
        event_longdescription: event.event_longdescription,
        address: event.address,
        slug: event.slug,
      }).filter(([_, value]) => value !== null && value !== undefined)
    );

    router.push(`/admin?${params.toString()}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Ukendt dato";
    const options = { day: "numeric", month: "long", year: "numeric" };
    try {
      return new Intl.DateTimeFormat("da-DK", options).format(new Date(dateString));
    } catch {
      return "Ukendt dato";
    }
  };

  return (
    <>
      <style jsx>{`
        .light-speed {
          animation-name: light-speed;
          animation-duration: 1s;
          animation-fill-mode: forwards;
          animation-timing-function: cubic-bezier(0.5, 1, 1, 1);
        }

        .animate-pulse {
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .bg-gray-300 {
          background-color: #e0e0e0;
        }

        @keyframes light-speed {
          0% {
            transform: translate(0px, 0);
          }
          5% {
            transform: scale(0.9, 1) translate(5px, 0);
          }
          5.5% {
            transform: scale(1, 0.5) translate(20px, 0);
          }
          25% {
            transform: scale(25, 0.1) translate(80px, 0);
          }
          30% {
            opacity: 0;
          }
          50.4% {
            transform: scale(100, 0) translate(100px, 0);
          }
          50.5% {
            opacity: 0;
            transform: translate(-160px, 0);
          }
          60% {
            opacity: 0;
            transform: scale(2, 0) translate(-40px, 0);
          }
          60.1% {
            opacity: 0.5;
            transform: scale(2, 1) translate(-21px, 0);
          }
          60.4% {
            opacity: 0.5;
          }
          60.5% {
            opacity: 1;
            transform: scale(4, 1) translate(-20px, 0);
          }
          61.5% {
            opacity: 1;
            transform: scale(1, 1) translate(-10px, 0);
          }
          100% {
            transform: scale(1, 1) translate(0px, 0);
          }
        }
      `}</style>
      <Head>
        <title>Event side</title>
        <meta name="Eventside" content="Tjek kommende Events ud" />
      </Head>
      <div className="min-h-screen mt-20 md:px-12 px-4 overflow-x-hidden">
        <div className="flex flex-col items-center mt-24 justify-center">
          <h1 className="text-customClamp md:mt-4 -mt-8 text-center font-bebas font-bold md:text-center text-bono-10 mb-16 md:mb-2">{targetDays !== null ? `${daysUntilNextEvent} Dage Til Næste Event!` : "Velkommen til Eventlisten"}</h1>
          <p className="font-montserrat md:font-semibold text-xl md:text-center text-center md:mt-0 -mt-10 mb-12 md:mb-24 max-w-[700px] text-bono-10">Bliv en del af fællesskabet! Tjek vores kommende events og gør en forskel som frivillig – vi glæder os til at se dig!</p>
          <hr className="w-full border-knap-10 mb-16" />
        </div>

        <div className="flex flex-col gap-8 items-center">
          {error && <p className="text-red-500">{error}</p>}
          {isLoading ? (
            // Skeleton Loading Placeholder
            <div className="flex flex-col gap-8 items-center">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="w-full  mx-auto animate-pulse">
                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-16">
                    <div className="order-1 md:order-2 flex-1">
                      <div className="bg-knap-10 h-4 w-32 mb-2 rounded"></div>
                      <div className="bg-knap-10 h-8 w-96 mb-4 rounded"></div>
                      <div className="bg-knap-10 h-4 w-96 mb-2 rounded"></div>
                      <div className="bg-knap-10 h-4 w-96 mb-2 rounded"></div>
                      <div className="bg-knap-10 h-10 w-96 mt-4 rounded"></div>
                    </div>
                    <div className="order-2 md:order-1 flex-shrink-0">
                      <div className="bg-knap-10 h-48 w-96 rounded shadow-lg"></div>
                    </div>
                  </div>
                  <hr className="w-full border-knap-10 my-8" />
                </div>
              ))}
            </div>
          ) : (
            // Indhold, når data er indlæst
            events
              .filter((event) => isLoggedIn || !event.ishidden)
              .map((event, index) => (
                <div key={index} className="w-full">
                  <div id={`event-${event.slug}`} className="flex flex-col md:flex-row items-center gap-4 md:gap-16 max-w-4xl mx-auto">
                    <div className="order-1 md:order-2 flex-1">
                      <p className="font-montserrat font-semibold text-sm text-bono-10">{formatDate(event.event_date)}</p>
                      <h1 className="font-bebas font-bold text-customClampMedium text-bono-10">{event.friendly_name}</h1>
                      <p className="font-montserrat mb-1 -mt-1 text-bono-10">
                        <strong>{event.address}</strong>
                      </p>
                      <p className="font-montserrat text-sm text-bono-10">{event.event_description}</p>
                      <Link href={`/events/${event.slug}`}>
                        <button className="flex justify-center items-center relative md:w-full w-96 h-12 max-w-[400px] mt-1 cursor-pointer" aria-label="Læs Mere">
                          <div className="absolute flex bg-knap-10 justify-center items-center h-8 w-full text-sm rounded-xl border-2 hover:border-blue-600 border-gray-500"></div>
                          <div className="absolute text-bono-10 hover:border-blue-600 text-base">Læs Mere</div>
                        </button>
                      </Link>
                      {isLoggedIn && (
                        <div className="flex items-center mt-4 gap-4">
                          <button onClick={() => handleEditEvent(event)} className="btn text-bono-10 btn-edit">
                            Rediger
                          </button>
                          <button onClick={() => toggleVisibility(event)} className={`px-4 py-2 ${event.ishidden ? "text-bono-10" : "text-bono-10"}`}>
                            {event.ishidden ? "Offentliggør" : "Skjul"}
                          </button>
                          <button onClick={() => handleDeleteEvent(event)} className="text-red-700 px-4 py-2">
                            Slet Event
                          </button>
                        </div>
                      )}
                    </div>
                    <Link href={`/events/${event.slug}`} className="order-2 md:order-1 mb-4 flex-shrink-0">
                      <Image src={event.image_url || "/placeholder.jpg"} alt={`Billede af ${event.friendly_name}`} width={400} height={300} className="rounded shadow-lg w-full max-w-[400px]" />
                    </Link>
                  </div>
                  <hr className="w-full border-knap-10 my-8" />
                </div>
              ))
          )}
        </div>
      </div>
    </>
  );
}
