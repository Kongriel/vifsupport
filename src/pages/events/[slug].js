import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [totalMissingVolunteers, setTotalMissingVolunteers] = useState(0);
  const [tasksNeedingVolunteers, setTasksNeedingVolunteers] = useState(0);
  const [displayVolunteers, setDisplayVolunteers] = useState(0);
  const [displayTasks, setDisplayTasks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { slug } = router.query;

  const handleShowPopup = () => setShowPopup(true);
  const handleClosePopup = () => setShowPopup(false);

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("taskId", tasks[index].id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = async (e, droppedIndex) => {
    e.preventDefault();

    const draggedTaskId = e.dataTransfer.getData("taskId");
    const draggedTaskIndex = tasks.findIndex((task) => task.id === draggedTaskId);

    if (draggedTaskIndex === -1) return;

    const reorderedTasks = [...tasks];
    const [draggedTask] = reorderedTasks.splice(draggedTaskIndex, 1);
    reorderedTasks.splice(droppedIndex, 0, draggedTask);

    const updatedTasks = reorderedTasks.map((task, index) => ({
      ...task,
      order: index,
    }));

    // Opdater lokalt state
    setTasks(updatedTasks);

    // Opdater rækkefølgen i databasen
    try {
      await Promise.all(updatedTasks.map((task) => supabase.from(eventInfo.table_name).update({ order: task.order }).eq("id", task.id)));
      console.log("Rækkefølgen er gemt i databasen.");
    } catch (error) {
      console.error("Fejl ved opdatering af rækkefølge:", error);
    }
  };

  const saveTaskOrder = async (updatedTasks) => {
    try {
      const updatePromises = updatedTasks.map((task) => supabase.from(eventInfo.table_name).update({ order: task.order }).eq("id", task.id));

      const results = await Promise.all(updatePromises);
      console.log("Rækkefølgen er gemt i databasen.", results);
    } catch (error) {
      console.error("Fejl ved gemning af rækkefølge:", error);
    }
  };

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("da-DK", options).format(new Date(dateString));
  };

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
    if (!slug) return;

    const fetchEventAndTasks = async () => {
      setIsLoading(true);

      try {
        const { data: tablesData, error: tablesError } = await supabase.rpc("get_public_tables");
        if (tablesError) throw tablesError;

        const opgaveTables = tablesData.map((table) => table.tablename).filter((name) => name.startsWith("opgaver"));

        let foundEvent = null;

        for (const table of opgaveTables) {
          const { data: eventData, error: eventError } = await supabase.from(table).select("friendly_name, slug, event_date, image_url, event_description, event_longdescription, address").eq("slug", slug).single();

          if (eventError) {
            if (eventError.code === "PGRST116") continue;
            throw eventError;
          }

          if (eventData) {
            foundEvent = { ...eventData, table_name: table };
            break;
          }
        }

        if (!foundEvent) throw new Error("Event ikke fundet");

        setEventInfo(foundEvent);

        const { data: tasksData, error: tasksError } = await supabase.from(foundEvent.table_name).select("id, title, short_description, date, needed_volunteers, ishidden");
        if (tasksError) throw tasksError;

        const volunteerTable = foundEvent.table_name.replace("opgaver", "tilmeldte");

        const updatedTasks = await Promise.all(
          tasksData.map(async (task) => {
            const { count, error: countError } = await supabase.from(volunteerTable).select("*", { count: "exact", head: true }).eq("task_id", task.id);

            if (countError) console.error("Fejl ved hentning af tilmeldte:", countError);
            return { ...task, signedUp: count || 0 };
          })
        );

        setTasks(updatedTasks);
      } catch (err) {
        console.error("Fejl ved hentning af event og opgaver:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventAndTasks();
  }, [slug]);

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !isLoggedIn) return;

    const confirmDelete = window.confirm("Er du sikker på, at du vil slette denne opgave?");
    if (!confirmDelete) {
      setDeleteTaskId(null);
      return;
    }

    try {
      const volunteerTable = eventInfo.table_name.replace("opgaver", "tilmeldte");

      // Slet relaterede frivillige
      const { error: volunteerError } = await supabase.from(volunteerTable).delete().eq("task_id", deleteTaskId);
      if (volunteerError) {
        console.error("Fejl ved sletning af relaterede frivillige:", volunteerError);
        alert("Kunne ikke slette relaterede data. Prøv igen.");
        setDeleteTaskId(null);
        return;
      }

      // Slet opgaven
      const { error: taskError } = await supabase.from(eventInfo.table_name).delete().eq("id", deleteTaskId);
      if (taskError) {
        console.error("Fejl ved sletning af opgave:", taskError);
        alert("Kunne ikke slette opgaven. Prøv igen.");
        setDeleteTaskId(null);
        return;
      }

      // Bekræft sletning til brugeren
      alert("Opgaven blev slettet!");

      // Start animationen efter bekræftelse
      const taskElement = document.getElementById(`task-${deleteTaskId}`);
      if (taskElement) {
        taskElement.classList.add("light-speed");

        // Vent på, at animationen er færdig (match animationens varighed i CSS)
        setTimeout(() => {
          setTasks((prevTasks) => prevTasks.filter((task) => task.id !== deleteTaskId));
        }, 1000); // Antag, at animationen varer 1 sekund
      }

      setDeleteTaskId(null);
    } catch (error) {
      console.error("Uventet fejl:", error);
      alert("Der opstod en uventet fejl. Prøv igen.");
      setDeleteTaskId(null);
    }
  };

  const isDatePast = (date) => new Date(date) < new Date();

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // Beregn manglende frivillige og opgaver uden fuld tilmelding
      const totalVolunteersNeeded = tasks.reduce((acc, task) => acc + Math.max(0, task.needed_volunteers - task.signedUp), 0);
      const tasksNotFull = tasks.filter((task) => task.signedUp < task.needed_volunteers).length;

      setTotalMissingVolunteers(totalVolunteersNeeded);
      setTasksNeedingVolunteers(tasksNotFull);
    }
  }, [tasks]);

  useEffect(() => {
    // Beregn værdier uden skjulte opgaver
    const visibleTasks = tasks.filter((task) => !task.ishidden);

    const totalVolunteersNeeded = visibleTasks.reduce((acc, task) => acc + Math.max(0, task.needed_volunteers - task.signedUp), 0);
    const tasksNotFull = visibleTasks.filter((task) => task.signedUp < task.needed_volunteers).length;

    let volunteerCounter = 0;
    const volunteerInterval = setInterval(() => {
      setDisplayVolunteers((prev) => {
        if (prev < totalVolunteersNeeded) {
          volunteerCounter++;
          return prev + 1;
        } else {
          clearInterval(volunteerInterval);
          return prev;
        }
      });
    }, 50);

    let taskCounter = 0;
    const taskInterval = setInterval(() => {
      setDisplayTasks((prev) => {
        if (prev < tasksNotFull) {
          taskCounter++;
          return prev + 1;
        } else {
          clearInterval(taskInterval);
          return prev;
        }
      });
    }, 80);

    return () => {
      clearInterval(volunteerInterval);
      clearInterval(taskInterval);
    };
  }, [tasks]);

  const handleToggleVisibility = async (taskId, currentVisibility) => {
    try {
      const newVisibility = !currentVisibility; // Skift synlighed
      const { data, error } = await supabase.from(eventInfo.table_name).update({ ishidden: newVisibility }).eq("id", taskId);

      if (error) throw error;

      console.log(`Opgave ${taskId} blev ${newVisibility ? "skjult" : "offentliggjort"}.`);
      setTasks((prevTasks) => prevTasks.map((task) => (task.id === taskId ? { ...task, ishidden: newVisibility } : task)));
    } catch (error) {
      console.error("Fejl ved opdatering af synlighed:", error);
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
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
        <title>Event-info og opgaver</title>
        <meta name="description" content="Oplev detaljer om eventet. Tilmeld dig opgaver, hjælp til arrangementet og gør en forskel som frivillig." />
      </Head>

      {isLoading ? (
        <div className="md:flex md:mt-32 items-center justify-center md:gap-12">
          <div className="p-4 pt-7 mt-16 md:mt-0  items-center flex justify-center">
            <div className="bg-knap-10 w-[400px] h-[300px] rounded-xl shadow-lg animate-pulse"></div>
          </div>
          <div className="p-7 -mb-8 text-left">
            <div className="bg-knap-10 h-6 w-40 mb-2 rounded animate-pulse"></div>
            <div className="bg-knap-10 h-12 w-96 mb-4 rounded animate-pulse"></div>
            <div className="bg-knap-10 h-4  w-96 mb-2 rounded animate-pulse"></div>
            <div className="bg-knap-10 h-4 w-96 mb-2 rounded animate-pulse"></div>
            <div className="bg-knap-10 h-8 w-96 mt-4 rounded animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="md:flex md:mt-32 items-center justify-center md:gap-12">
          <div className="p-4 pt-7 mt-16 md:mt-0  items-center flex justify-center">
            <Image src={eventInfo.image_url || "/placeholder.jpg"} alt="Event Billede" width={400} height={300} className="rounded-xl  shadow-lg" />
          </div>
          <div className="p-7 -mb-8 text-left">
            <p className="text-gray-700 font-bold md:text-lg pt-1 mb-2 text-sm">{formatDate(eventInfo.event_date)}</p>
            <h1 className="text-gray-700 mb-2 font-bold  break-words max-w-[600px] text-customClampMedium">{eventInfo.friendly_name}</h1>

            <p className="text-bono-10 mb-2 font-montserrat md:mt-3 break-words max-w-[600px]">{eventInfo.event_longdescription}</p>
            <p className="text-bono-10 mb-2">
              <strong> Addresse: {eventInfo.address}</strong>
            </p>
            <button onClick={handleShowPopup} className="mt-2 px-6 text-slate-900 border border-slate-900 p-1 rounded-lg text-left w-fit">
              Vis mere
            </button>
          </div>
        </div>
      )}

      {showPopup && (
        <div className="fixed px-4 inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-6 bg-bono-10 rounded-lg shadow-lg relative max-w-lg w-full">
            <button onClick={handleClosePopup} className="absolute top-2 right-2 text-taupe-10 text-2xl font-bold">
              &times;
            </button>

            <h2 className="text-xl font-bold text-taupe-10 mb-4">Bliv en Frivillig Helt!</h2>
            <p className="text-taupe-10 mb-6">At være frivillig betyder at være en del af noget større – at bidrage til fællesskabet og gøre en forskel for andre. Uanset om det er til arrangementer, opvisninger eller daglige opgaver, er din indsats uvurderlig. Som frivillig får du ikke kun muligheden for at hjælpe, men også for at skabe nye venskaber, lære nye færdigheder og opleve glæden ved at se din indsats gøre en forskel. Sammen kan vi nå langt – og med din hjælp kan vi gøre endnu mere. Tak, fordi du overvejer at give lidt af din tid og energi. Din indsats betyder alt!</p>
          </div>
        </div>
      )}

      <div className="p-8 mt-10  justify-center items-center content-center md:p-16 min-h-screen">
        <h1 className="md:text-5xl text-4xl font-bold mb-6 md:text-center text-bono-10">Opgavelisten</h1>
        <p className="md:text-center md:text-3xl text-bono-10 font-montserrat mb-10 ">
          Vi mangler <strong> {displayVolunteers} frivillige </strong> fordelt på <strong>{displayTasks} opgaver</strong>
        </p>

        <div className="grid grid-cols-1 gap-4">
          {tasks
            .filter((task) => task.title) // Filtrerer opgaver, der har en titel
            .map((task, index) => {
              const isPast = isDatePast(task.date);
              const isFull = task.signedUp >= task.needed_volunteers;

              if (!isLoggedIn && task.ishidden) {
                return null;
              }

              return (
                <div key={task.id} id={`task-${task.id}`} className="px-4 md:px-8 py-2 rounded" draggable={isLoggedIn} onDragStart={isLoggedIn ? (e) => handleDragStart(e, index) : null} onDragOver={isLoggedIn ? (e) => handleDragOver(e) : null} onDrop={isLoggedIn ? (e) => handleDrop(e, index) : null}>
                  <div className="justify-between mt-2">
                    <p className="text-bono-10 -mb-1 md:mb-0 text-sm">
                      {task.signedUp} ud af {task.needed_volunteers} tilmeldte
                    </p>
                    <h2 className="text-customClampMedium text-wrap font-bold text-gray-800 relative">
                      <a href={`/tasks/${task.id}?type=${eventInfo.table_name}`} className="relative group">
                        {task.title}
                        <span className="absolute bottom-0 left-0 w-0 h-1 bg-gray-800 transition-all duration-200 group-hover:w-full" />
                      </a>
                    </h2>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div className="flex-1 md:mr-4">
                      <p className="text-sm md:text-lg mb-1 md:mt-1 text-bono-10 font-montserrat">{task.short_description}</p>
                    </div>
                    {isLoggedIn && (
                      <div className="flex gap-4 items-center md:pr-10 md:mb-0 mb-7 mt-2">
                        <div className="relative group md:-mt-14">
                          <button onClick={() => handleToggleVisibility(task.id, task.ishidden)} className="px-4 py-2 flex items-center justify-center" aria-label="offentliggør opgave">
                            {task.ishidden ? (
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
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 duration-200 group-hover:scale-110" aria-label="skjul opgave">
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
                          <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{task.ishidden ? "Klik for at offentliggøre" : "Klik for at skjule"}</span>
                        </div>

                        <div className="relative group md:-mt-14 cursor-pointer">
                          <button
                            onClick={() => {
                              console.log("Slet knappen er klikket for opgave:", task.id);
                              setDeleteTaskId(task.id);
                              handleDeleteTask();
                            }}
                            className="text-red-900 px-4 py-2 flex items-center justify-center"
                            aria-label="slet opgave"
                          >
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
                          <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-red-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Slet Opgave</span>
                        </div>
                      </div>
                    )}
                    <Link
                      href={
                        isPast || isFull
                          ? "#"
                          : {
                              pathname: `/tasks/${task.id}`,
                              query: { type: eventInfo.table_name, eventSlug: eventInfo.slug }, // Tilføj eventSlug her
                            }
                      }
                    >
                      <button
                        className={`group relative md:-mt-12 flex justify-center items-center w-full md:w-auto md:h-16 mt-2 h-10 max-w-[500px] px-24 rounded-2xl border-2 overflow-hidden ${isFull ? "bg-knap-10 text-bono-10 cursor-not-allowed border-gray-500" : "bg-knap-10 text-bono-10 border-gray-500 hover:border-blue-600"}`}
                        onClick={(e) => {
                          if (isFull) e.preventDefault(); // Forhindre navigation, hvis ikke tilgængelig
                        }}
                      >
                        <span className="absolute top-1/2 left-0 right-0 text-center transform -translate-y-1/2 transition-all duration-180 ease-in-out md:group-hover:-translate-y-[250%] text-sm md:text-xl font-bold">{isFull ? "Ikke tilgængelig" : "Tilmeld Dig!"}</span>
                        <span className="absolute top-full left-0 right-0 text-center transform translate-y-0 transition-all duration-180 ease-in-out md:group-hover:translate-y-[-160%] text-sm md:text-xl font-bold">{isFull ? "" : "Tilmeld Dig!"}</span>
                      </button>
                    </Link>
                  </div>
                  <hr className="w-full border-knap-10 mt-6 -mb-3" />
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
