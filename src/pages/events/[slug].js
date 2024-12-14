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
  const router = useRouter();
  const { slug } = router.query;

  const handleShowPopup = () => setShowPopup(true);
  const handleClosePopup = () => setShowPopup(false);

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("taskId", tasks[index].id);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Tillader drop
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

        // Tilføj `is_hidden`-kolonne og filtrér baseret på loginstatus
        const { data: tasksData, error: tasksError } = await supabase.from(foundEvent.table_name).select("id, title, short_description, date, needed_volunteers, ishidden");
        if (tasksError) throw tasksError;

        const volunteerTable = foundEvent.table_name.replace("opgaver", "tilmeldte");

        const updatedTasks = await Promise.all(
          tasksData
            .filter((task) => (isLoggedIn ? true : !task.isHdden)) // Filtrér skjulte opgaver, hvis ikke logget ind
            .map(async (task) => {
              const { count, error: countError } = await supabase.from(volunteerTable).select("*", { count: "exact", head: true }).eq("task_id", task.id);

              if (countError) console.error("Fejl ved hentning af tilmeldte:", countError);
              return { ...task, signedUp: count || 0 };
            })
        );

        const sortedTasks = updatedTasks.sort((a, b) => {
          const isPastA = new Date(a.date) < new Date();
          const isPastB = new Date(b.date) < new Date();
          return isPastA !== isPastB ? (isPastA ? 1 : -1) : new Date(a.date) - new Date(b.date);
        });

        setTasks(sortedTasks);
      } catch (err) {
        console.error("Fejl ved hentning af event og opgaver:", err);
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
      const taskElement = document.getElementById(`task-${deleteTaskId}`);
      if (taskElement) {
        taskElement.classList.add("light-speed");
        setTimeout(() => {
          taskElement.classList.add("light-speed-active");
        }, 10);
      }

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

      // Fjern opgaven fra DOM
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== deleteTaskId));
      setDeleteTaskId(null);
      alert("Opgaven blev slettet!");
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
    }, 50); // Hver 50ms opdateres værdien

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
    }, 80); // Hver 80ms opdateres værdien

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

  if (!eventInfo) {
    return <div className="text-center text-gray-700 font-bold mt-20">Indlæser event...</div>;
  }

  return (
    <>
      <style jsx>{`
        .light-speed {
          animation-name: light-speed;
          animation-duration: 1s;
          animation-fill-mode: forwards;
          animation-timing-function: cubic-bezier(0.5, 1, 1, 1);
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
        <title>Event opgaver</title>
        <meta name="description" content="Learn more about us on this page." />
      </Head>

      <div className="md:flex md:mt-32 items-center justify-center md:gap-12">
        <div className="p-4 pt-7 mt-16 md:mt-0  items-center flex justify-center">
          <Image src={eventInfo.image_url || "/placeholder.jpg"} alt="Event Billede" width={400} height={300} className="rounded-xl  shadow-lg" />
        </div>
        <div className="p-7 -mb-8 text-left">
          <p className="text-gray-700 font-bold md:text-lg pt-1 text-sm">{formatDate(eventInfo.event_date)}</p>
          <h1 className="text-gray-700 mb-2 font-bold md:text-6xl text-5xl">{eventInfo.friendly_name}</h1>

          <p className="text-bono-10 font-montserrat">{eventInfo.event_description}</p>
          <p className="text-bono-10 mb-2 font-montserrat break-words max-w-[600px]">{eventInfo.event_longdescription}</p>
          <p className="text-bono-10 mb-2">
            <strong> Addresse: {eventInfo.address}</strong>
          </p>
          <button onClick={handleShowPopup} className="mt-2 px-6 text-slate-900 border border-slate-900 p-1 rounded-lg text-left w-fit">
            Vis mere
          </button>
        </div>
      </div>

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

              // Kun vis opgaven, hvis brugeren er logget ind, eller opgaven ikke er skjult
              if (!isLoggedIn && task.ishidden) {
                return null;
              }

              return (
                <div
                  key={task.id}
                  id={`task-${task.id}`}
                  className="px-4 md:px-8 py-2 rounded"
                  draggable={isLoggedIn} // Kun draggable, hvis logget ind
                  onDragStart={isLoggedIn ? (e) => handleDragStart(e, index) : null}
                  onDragOver={isLoggedIn ? (e) => handleDragOver(e) : null}
                  onDrop={isLoggedIn ? (e) => handleDrop(e, index) : null}
                >
                  <div className="justify-between mt-2">
                    <p className="text-bono-10 -mb-1 md:mb-0 text-sm">
                      {task.signedUp} ud af {task.needed_volunteers} tilmeldte
                    </p>
                    <h2 className="text-customClampMedium text-wrap font-bold text-gray-800">
                      <a href={`/tasks/${task.id}?type=${eventInfo.table_name}`} className="hover:underline">
                        {task.title}
                      </a>
                    </h2>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div className="flex-1 md:mr-4">
                      <p className="text-sm md:text-lg mb-1 md:mt-1 text-bono-10 font-montserrat">{task.short_description}</p>
                    </div>
                    {isLoggedIn && (
                      <div className="flex gap-4 items-center md:pr-10 mt-2">
                        <button onClick={() => handleToggleVisibility(task.id, task.ishidden)} className={`${task.ishidden ? "" : ""} text-bono-10 px-4 py-2 font-montserrat md:-mt-14 cursor-pointer rounded`}>
                          {task.ishidden ? "Offentligør" : "Skjul"}
                        </button>
                        <button
                          onClick={() => {
                            console.log("Slet knappen er klikket for opgave:", task.id);
                            setDeleteTaskId(task.id);
                            handleDeleteTask();
                          }}
                          className="text-red-900 px-4 cursor-pointer font-montserrat md:-mt-14 py-2 rounded"
                        >
                          Slet
                        </button>
                      </div>
                    )}
                    <Link href={isPast || isFull ? "#" : `/tasks/${task.id}?type=${eventInfo.table_name}`}>
                      <button
                        className={`group relative md:-mt-12 flex justify-center items-center w-full md:w-auto md:h-16 mt-2 h-10 max-w-[500px] px-24 rounded-2xl border-2 overflow-hidden ${isFull ? "bg-gray-400 text-gray-700 cursor-not-allowed border-gray-500" : "bg-knap-10 text-bono-10 border-gray-500 hover:border-blue-600"}`}
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
