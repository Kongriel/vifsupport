import { useState, useEffect } from "react";
import { supabase } from "/lib/supabaseClient";
import Image from "next/image";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showPopup, setShowPopup] = useState(false);

  const handleShowPopup = () => setShowPopup(true);
  const handleClosePopup = () => setShowPopup(false);

  useEffect(() => {
    const fetchTasksWithSignupCount = async () => {
      const { data: tasksData, error: tasksError } = await supabase.from("opgaver2").select("id, title, short_description, date, needed_volunteers");

      if (tasksError) {
        console.error("Fejl ved hentning af opgaver:", tasksError);
        return;
      }

      const updatedTasks = await Promise.all(
        tasksData.map(async (task) => {
          const { count, error: countError } = await supabase.from("tilmeldte2").select("*", { count: "exact", head: true }).eq("task_id", task.id);

          if (countError) {
            console.error("Fejl ved hentning af tilmeldte:", countError);
          }

          return {
            ...task,
            signedUp: count || 0,
          };
        })
      );

      setTasks(updatedTasks);
    };

    fetchTasksWithSignupCount();
  }, []);

  return (
    <>
      <div className="p-7 -mb-8 text-left">
        <h1 className="text-gray-700 font-bold md:text-4xl text-3xl pt-20">Vif Instruktørdag</h1>
        <h1 className="text-gray-700 font-bold md:text-4xl pt-1 text-3xl">2025</h1>
      </div>
      <div className="p-4 pt-7 items-center  flex justify-center">
        <Image src="/sforside.jpg" alt="Billede 1" width={400} height={300} className="rounded-xl shadow-lg" />
      </div>
      <div className="text-gray-900 font-sans text-lg p-7 -mb-8 text-left">
        <p>Valby IF inviterer til en dag fyldt med spændende gymnastik, fællesskab og festlig stemning. Kom og oplev vores dygtige gymnaster i alle aldre vise deres færdigheder på gulvet. Arrangementet finder sted i DGI Byen. Vi glæder os til at se jer! </p>
        <button onClick={handleShowPopup} className="mt-2 px-6 text-slate-900 border border-slate-900 p-2 rounded-lg text-left w-fit">
          Vis mere
        </button>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="fixed px-4 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg relative max-w-lg w-full">
            <button onClick={handleClosePopup} className="absolute top-2 right-2 text-gray-700 text-2xl font-bold hover:text-gray-900">
              &times;
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Om Instruktørdagen</h2>
            <p className="text-gray-700">Instruktørdagen er en årlig begivenhed, hvor Valby IF samler gymnaster og familier til en dag med glæde, fællesskab og imponerende præstationer.</p>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Om Instruktørdagen</h2>
            <p className="text-gray-700">Instruktørdagen er en årlig begivenhed, hvor Valby IF samler gymnaster og familier til en dag med glæde, fællesskab og imponerende præstationer.</p>
          </div>
        </div>
      )}

      <div className="p-8 md:p-16 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Opgaver</h1>

        {/* Tabel til større skærme */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Opgave</th>
                <th className="py-3 px-6 text-left">Kort Beskrivelse</th>
                <th className="py-3 px-6 text-left">Dato</th>
                <th className="py-3 px-6 text-center">Frivillige</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left">
                    <a href={`/tasks/${task.id}?type=opgaver2`} className="text-blue-500 font-bold text-xl hover:underline">
                      {task.title}
                    </a>
                  </td>
                  <td className="py-3 px-6 text-lg text-left">{task.short_description}</td>
                  <td className="py-3 px-6 text-lg text-left">{task.date}</td>
                  <td className="py-3 px-6 text-lg text-center">
                    {task.signedUp} ud af {task.needed_volunteers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobil */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {tasks.map((task) => (
            <div key={task.id} className="p-4 rounded shadow">
              <h2 className="text-xl font-bold text-gray-800">
                <a href={`/tasks/${task.id}`} className="hover:underline">
                  {task.title}
                </a>
              </h2>

              <p className="text-gray-800 font-semibold"> {task.date}</p>
              <div>
                <p className="text-gray-900 font-semibold">Tietgensgade 65</p>
                <p className="text-gray-900">København V</p>
                <p className="text-gray-600 mt-2">
                  {task.signedUp} ud af {task.needed_volunteers} tilmeldte
                </p>
              </div>
              <button className="mt-2 text-white bg-slate-900 p-2 rounded-lg text-center w-full">Tilmeld</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
