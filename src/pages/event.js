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
        setIsLoading(false);
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

      // Vis bekræftelsesbesked først
      alert(`Eventet "${event.friendly_name}" og dets relaterede tabeller blev slettet.`);

      // Start sletteanimationen efter bekræftelsesbeskeden
      const deleteElement = document.getElementById(`event-${event.slug}`);
      if (deleteElement) {
        deleteElement.classList.add("light-speed");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Match animationens varighed
      }

      // Fjern eventet fra UI
      setEvents((prevEvents) => prevEvents.filter((e) => e.slug !== event.slug));
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
          @keyframes lift-lid {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-6px);
            }
          }

          .animate-lift-lid {
            animation: lift-lid 0.3s ease-in-out forwards;
          }
        }
      `}</style>
      <Head>
        <title>Event side</title>
        <meta name="description" content="Se en oversigt over kommende events og bliv en del af fællesskabet ved at tilmelde dig som frivillig til spændende opgaver." />
      </Head>
      <div className="min-h-screen mt-4 md:px-12 px-4 overflow-x-hidden">
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
                <div key={index} className="w-full ">
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
                        <div className="flex items-center md:px-2 mb-5 mt-4 gap-3">
                          <div className="relative group">
                            <button onClick={() => handleEditEvent(event)} className="btn text-bono-10 btn-edit py-2 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                  <path d="M21 11V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V7C3 4.79086 4.79086 3 7 3H13" stroke="#36454D" stroke-width="2" stroke-linecap="round"></path>
                                  <path d="M17.9227 3.52798C18.2607 3.18992 18.7193 3 19.1973 3C19.6754 3 20.134 3.18992 20.472 3.52798C20.8101 3.86605 21 4.32456 21 4.80265C21 5.28075 20.8101 5.73926 20.472 6.07732L12.3991 14.1502L9 15L9.84978 11.6009L17.9227 3.52798Z" stroke="#36454D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="transform transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"></path>
                                  <path d="M16 6L18 8" stroke="#36454D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="transform transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"></path>
                                </g>
                              </svg>
                            </button>
                            {/* Tooltip */}
                            <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Rediger</span>
                          </div>

                          <div className="relative group">
                            <button onClick={() => toggleVisibility(event)} className="px-4 py-2 flex items-center justify-center">
                              {event.ishidden ? (
                                // Åbent øje for offentliggør
                                <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" className="w-8 h-8 duration-200 group-hover:scale-110">
                                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                  <g id="SVGRepo_iconCarrier">
                                    <path
                                      fill="#36454D"
                                      fill-rule="evenodd"
                                      d="M3.415 10.242c-.067-.086-.13-.167-.186-.242a16.806 16.806 0 011.803-2.025C6.429 6.648 8.187 5.5 10 5.5c1.813 0 3.57 1.148 4.968 2.475A16.816 16.816 0 0116.771 10a16.9 16.9 0 01-1.803 2.025C13.57 13.352 11.813 14.5 10 14.5c-1.813 0-3.57-1.148-4.968-2.475a16.799 16.799 0 01-1.617-1.783zm15.423-.788L18 10l.838.546-.002.003-.003.004-.01.016-.037.054a17.123 17.123 0 01-.628.854 18.805 18.805 0 01-1.812 1.998C14.848 14.898 12.606 16.5 10 16.5s-4.848-1.602-6.346-3.025a18.806 18.806 0 01-2.44-2.852 6.01 6.01 0 01-.037-.054l-.01-.016-.003-.004-.001-.002c0-.001-.001-.001.837-.547l-.838-.546.002-.003.003-.004.01-.016a6.84 6.84 0 01.17-.245 18.804 18.804 0 012.308-2.66C5.151 5.1 7.394 3.499 10 3.499s4.848 1.602 6.346 3.025a18.803 18.803 0 012.44 2.852l.037.054.01.016.003.004.001.002zM18 10l.838-.546.355.546-.355.546L18 10zM1.162 9.454L2 10l-.838.546L.807 10l.355-.546zM9 10a1 1 0 112 0 1 1 0 01-2 0zm1-3a3 3 0 100 6 3 3 0 000-6z"
                                    ></path>
                                  </g>
                                </svg>
                              ) : (
                                // Lukket øje for skjul
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 duration-200 group-hover:scale-110">
                                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                  <g id="SVGRepo_iconCarrier">
                                    <path
                                      fill-rule="evenodd"
                                      clip-rule="evenodd"
                                      d="M19.7071 5.70711C20.0976 5.31658 20.0976 4.68342 19.7071 4.29289C19.3166 3.90237 18.6834 3.90237 18.2929 4.29289L14.032 8.55382C13.4365 8.20193 12.7418 8 12 8C9.79086 8 8 9.79086 8 12C8 12.7418 8.20193 13.4365 8.55382 14.032L4.29289 18.2929C3.90237 18.6834 3.90237 19.3166 4.29289 19.7071C4.68342 20.0976 5.31658 20.0976 5.70711 19.7071L9.96803 15.4462C10.5635 15.7981 11.2582 16 12 16C14.2091 16 16 14.2091 16 12C16 11.2582 15.7981 10.5635 15.4462 9.96803L19.7071 5.70711ZM12.518 10.0677C12.3528 10.0236 12.1792 10 12 10C10.8954 10 10 10.8954 10 12C10 12.1792 10.0236 12.3528 10.0677 12.518L12.518 10.0677ZM11.482 13.9323L13.9323 11.482C13.9764 11.6472 14 11.8208 14 12C14 13.1046 13.1046 14 12 14C11.8208 14 11.6472 13.9764 11.482 13.9323ZM15.7651 4.8207C14.6287 4.32049 13.3675 4 12 4C9.14754 4 6.75717 5.39462 4.99812 6.90595C3.23268 8.42276 2.00757 10.1376 1.46387 10.9698C1.05306 11.5985 1.05306 12.4015 1.46387 13.0302C1.92276 13.7326 2.86706 15.0637 4.21194 16.3739L5.62626 14.9596C4.4555 13.8229 3.61144 12.6531 3.18002 12C3.6904 11.2274 4.77832 9.73158 6.30147 8.42294C7.87402 7.07185 9.81574 6 12 6C12.7719 6 13.5135 6.13385 14.2193 6.36658L15.7651 4.8207ZM12 18C11.2282 18 10.4866 17.8661 9.78083 17.6334L8.23496 19.1793C9.37136 19.6795 10.6326 20 12 20C14.8525 20 17.2429 18.6054 19.002 17.0941C20.7674 15.5772 21.9925 13.8624 22.5362 13.0302C22.947 12.4015 22.947 11.5985 22.5362 10.9698C22.0773 10.2674 21.133 8.93627 19.7881 7.62611L18.3738 9.04043C19.5446 10.1771 20.3887 11.3469 20.8201 12C20.3097 12.7726 19.2218 14.2684 17.6986 15.5771C16.1261 16.9282 14.1843 18 12 18Z"
                                      fill="#36454D"
                                    ></path>
                                  </g>
                                </svg>
                              )}
                            </button>
                            {/* Tooltip */}
                            <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{event.ishidden ? "Klik for at offentliggøre" : "Klik for at skjule"}</span>
                          </div>

                          <div className="relative group cursor-pointer">
                            <button onClick={() => handleDeleteEvent(event)} className="text-red-700 px-0 py-2 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                  {/* Skraldespandens låg */}
                                  <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="#36454D" stroke-width="2" className="lid transform origin-right transition-transform duration-300 group-hover:-rotate-12 group-hover:-translate-y-1"></path>
                                  <path d="M20.5001 6H3.5" stroke="#36454D" stroke-width="2" stroke-linecap="round" className="lid transform origin-right transition-transform duration-300 group-hover:-rotate-12 group-hover:-translate-y-1"></path>
                                  {/* Skraldespandens krop */}
                                  <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="#36454D" stroke-width="2" stroke-linecap="round"></path>
                                  <path d="M9.5 11L10 16" stroke="#36454D" stroke-width="2" stroke-linecap="round"></path>
                                  <path d="M14.5 11L14 16" stroke="#36454D" stroke-width="2" stroke-linecap="round"></path>
                                </g>
                              </svg>
                            </button>
                            {/* Tooltip */}
                            <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-red-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Slet Event</span>
                          </div>
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
