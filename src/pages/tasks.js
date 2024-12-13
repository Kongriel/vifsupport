import { useState, useEffect } from "react";
import { supabase } from "/lib/supabaseClient";
import Image from "next/image";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Holder login-status
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const handleShowPopup = () => setShowPopup(true);
  const handleClosePopup = () => setShowPopup(false);

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("da-DK", options).format(new Date(dateString));
  };

  const fetchTasksWithSignupCount = async () => {
    const { data: tasksData, error: tasksError } = await supabase.from("opgaver1").select("id, title, short_description, date, needed_volunteers");

    if (tasksError) {
      console.error("Fejl ved hentning af opgaver:", tasksError);
      return;
    }

    const updatedTasks = await Promise.all(
      tasksData.map(async (task) => {
        const { count, error: countError } = await supabase.from("tilmeldte").select("*", { count: "exact", head: true }).eq("task_id", task.id);

        if (countError) {
          console.error("Fejl ved hentning af tilmeldte:", countError);
        }

        return {
          ...task,
          signedUp: count || 0,
        };
      })
    );

    // Sortér opgaver: kommende opgaver først, overskredne opgaver til sidst
    const sortedTasks = updatedTasks.sort((a, b) => {
      const isPastA = new Date(a.date) < new Date();
      const isPastB = new Date(b.date) < new Date();
      if (isPastA !== isPastB) return isPastA ? 1 : -1; // Overskredet dato flyttes til bunden
      return new Date(a.date) - new Date(b.date); // Sorter på dato
    });

    setTasks(sortedTasks);
  };

  const isDatePast = (date) => new Date(date) < new Date();

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
        // Tilføj 'task-exit-active' efter en lille forsinkelse
        taskElement.classList.add("task-exit");
        setTimeout(() => {
          taskElement.classList.add("task-exit-active");
        }, 10); // Forsinkelsen gør, at animationen starter

        // Vent på animationen, før opgaven slettes
        setTimeout(async () => {
          // Slet relaterede tidsrum fra time_slots
          const { error: timeSlotsError } = await supabase.from("time_slots").delete().eq("task_id", deleteTaskId);

          if (timeSlotsError) {
            console.error("Fejl ved sletning af tidsrum:", timeSlotsError);
            alert("Kunne ikke slette tidsrum. Prøv igen.");
            setDeleteTaskId(null);
            return;
          }

          // Slet opgaven fra opgaver1
          const { error: taskError } = await supabase.from("opgaver1").delete().eq("id", deleteTaskId);

          if (taskError) {
            console.error("Fejl ved sletning af opgave:", taskError);
            alert("Kunne ikke slette opgaven. Prøv igen.");
            setDeleteTaskId(null);
            return;
          }

          // Fjern opgaven fra listen
          setTasks((prevTasks) => prevTasks.filter((task) => task.id !== deleteTaskId));
          setDeleteTaskId(null); // Nulstil slet-tilstand
        }, 50); // Matcher animationens varighed
      }
    } catch (error) {
      console.error("Uventet fejl:", error);
      alert("Der opstod en uventet fejl. Prøv igen.");
      setDeleteTaskId(null);
    }
  };

  useEffect(() => {
    const checkLoginStatus = () => {
      const status = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(status); // Gem status for at vise/skjule slet-knappen
    };

    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  useEffect(() => {
    fetchTasksWithSignupCount();
  }, []);

  return (
    <>
      <style jsx>{`
        .task-exit {
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.05 ease-out, transform 0.05s ease-out;
        }
        .task-exit.task-exit-active {
          opacity: 0;
          transform: translateX(100%); /* Flytter elementet ud af skærmen til højre */
        }
      `}</style>

      <div className="p-7 -mb-8 md:hidden text-left">
        <h1 className="text-gray-700 font-bold md:text-4xl text-3xl pt-20">Vif Forårsopvisning</h1>
        <h1 className="text-gray-700 font-bold md:text-4xl pt-1 text-3xl">2025</h1>
      </div>
      <div className="p-4 pt-7 md:-mt-28 items-center flex justify-center">
        <Image src="/sforside.jpg" alt="Billede 1" width={400} height={300} className="rounded-xl md:w-1/2 shadow-lg" />
      </div>

      <div className="text-gray-900 font-sans text-lg p-7 -mb-8 text-left">
        <p>Valby IF inviterer til en dag fyldt med spændende gymnastik, fællesskab og festlig stemning. Kom og oplev vores dygtige gymnaster i alle aldre vise deres færdigheder på gulvet. Arrangementet finder sted i DGI Byen. Vi glæder os til at se jer! </p>
        <button onClick={handleShowPopup} className="mt-2 px-6 text-slate-900 border border-slate-900 p-1 rounded-lg text-left w-fit">
          Vis mere
        </button>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="fixed px-4 inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className=" p-6 bg-bono-10 rounded-lg shadow-lg relative max-w-lg w-full">
            <button onClick={handleClosePopup} className="absolute top-2 right-2 text-taupe-10 text-2xl font-bold">
              &times;
            </button>
            <h2 className="text-xl font-bold text-taupe-10 mb-4">Om Forårsopvisningen</h2>
            <p className="text-taupe-10 mb-6">Forårsopvisningen er en årlig begivenhed, hvor Valby IF samler gymnaster og familier til en dag med glæde, fællesskab og imponerende præstationer.</p>
            <h2 className="text-xl font-bold text-taupe-10 mb-4">Om Forårsopvisningen</h2>
            <p className="text-taupe-10">Forårsopvisningen er en årlig begivenhed, hvor Valby IF samler gymnaster og familier til en dag med glæde, fællesskab og imponerende præstationer.</p>
          </div>
        </div>
      )}

      <div className="p-8 md:p-16  min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Opgavelisten </h1>

        {/* Liste over opgaver */}
        <div className="grid grid-cols-1 gap-4">
          {tasks.map((task) => {
            const isPast = isDatePast(task.date);
            const isFull = task.signedUp >= task.needed_volunteers; // Tjek om opgaven er fuldtegnet

            return (
              <div id={`task-${task.id}`} key={task.id} className="px-4 py-2 rounded shadow">
                <div className="flex justify-between mt-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    <a href={`/tasks/${task.id}?type=opgaver1`} className="hover:underline">
                      {task.title}
                    </a>
                  </h2>
                  {isLoggedIn && (
                    <button
                      onClick={() => setDeleteTaskId(task.id)} // Sæt task.id for sletning
                      className="px-4 py-2 text-red-800"
                    >
                      Slet
                    </button>
                  )}
                </div>
                <p className="text-gray-800 mb-4 font-semibold">{formatDate(task.date)}</p>
                <p className="text-gray-600">
                  {task.signedUp} ud af {task.needed_volunteers} tilmeldte
                </p>
                <a
                  href={isPast || isFull ? "#" : `/tasks/${task.id}?type=opgaver1`}
                  className={`mt-2 block text-center p-2 rounded-lg w-full ${isPast || isFull ? "bg-gray-400 text-gray-700 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-700"}`}
                  onClick={(e) => {
                    if (isPast || isFull) e.preventDefault(); // Forhindrer navigation
                  }}
                >
                  {isPast ? "Ikke længere tilgængelig" : isFull ? "Ikke tilgængelig" : "Tilmeld"}
                </a>
              </div>
            );
          })}
        </div>
      </div>
      {deleteTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className=" p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Er du sikker på, at du vil slette denne opgave?</h2>
            <div className="flex justify-end gap-4">
              <button onClick={() => setDeleteTaskId(null)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
                Annuller
              </button>
              <button onClick={handleDeleteTask} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Slet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
