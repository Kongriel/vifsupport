import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "/lib/supabaseClient";
import confetti from "canvas-confetti";
import Head from "next/head";

export default function TaskDetail({ isLoggedIn }) {
  const router = useRouter();
  const { id, type } = router.query;

  const [task, setTask] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [teamName, setTeamName] = useState("");
  const [childName, setChildName] = useState("");
  const [comment, setComment] = useState("");
  const [isParent, setIsParent] = useState(false);
  const [message, setMessage] = useState("");
  const [friendlyName, setFriendlyName] = useState("");

  // Dynamisk tabelnavn baseret på "type"
  const taskTable = type === "opgaver2" ? "opgaver2" : "opgaver1";
  const volunteerTable = type === "opgaver2" ? "tilmeldte2" : "tilmeldte";
  const timeSlotTable = type === "opgaver2" ? "time_slots2" : "time_slots";

  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hour, minute] = time.split(":");
    return `${hour}:${minute}`;
  };

  const getEventName = (type) => {
    switch (type) {
      case "opgaver1":
        return "Forårsopvisning";
      case "opgaver2":
        return "Instruktør Dag";
      default:
        return "Ukendt Event";
    }
  };

  const fetchTaskData = async () => {
    if (!id || !type) {
      console.error("ID or type is not defined.");
      return;
    }

    console.log("Fetching task with ID:", id, "and type:", type);

    const taskTable = type || "opgaver1"; // Default to "opgaver1"
    const timeSlotTable = type.startsWith("opgaver") ? `time_slots${type.replace("opgaver", "")}` : "time_slots"; // Dynamic time_slots table
    const volunteerTable = type.startsWith("opgaver") ? `tilmeldte${type.replace("opgaver", "")}` : "tilmeldte"; // Dynamic volunteer table

    console.log("Target task table:", taskTable);
    console.log("Target time slots table:", timeSlotTable);
    console.log("Target volunteer table:", volunteerTable);

    setLoading(true);
    try {
      // Query the task by ID, include 'address' column
      const { data: taskData, error: taskError } = await supabase.from(taskTable).select("*, address").eq("id", id).single();

      if (taskError) {
        console.error("Error fetching task:", taskError.message);
        setTask(null);
        setLoading(false);
        return;
      }

      console.log("Fetched task data:", taskData);
      setTask(taskData);

      // Query volunteers
      const { data: volunteersData, error: volunteersError } = await supabase.from(volunteerTable).select("*").eq("task_id", id);

      if (volunteersError) {
        console.error("Error fetching volunteers:", volunteersError.message);
        setVolunteers([]);
      } else {
        console.log("Fetched volunteers:", volunteersData);
        setVolunteers(volunteersData || []);
      }

      // Query time slots
      const { data: timeSlotsData, error: timeSlotsError } = await supabase.from(timeSlotTable).select("*").eq("task_id", id);

      if (timeSlotsError) {
        console.error("Error fetching time slots:", timeSlotsError.message);
        setTimeSlots([]);
      } else {
        console.log("Fetched time slots:", timeSlotsData);
        setTimeSlots(
          (timeSlotsData || []).map((slot) => ({
            ...slot,
            available_spots: slot.max_volunteers - (slot.current_volunteers || 0),
          }))
        );
      }
    } catch (err) {
      console.error("Unexpected error fetching task data:", err.message);
    }
    setLoading(false);
  };

  const toggleVolunteerDetails = (volunteerId) => {
    if (!isLoggedIn) return;
    setSelectedVolunteerId((prevId) => (prevId === volunteerId ? null : volunteerId));
  };

  useEffect(() => {
    fetchTaskData();
  }, [id, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task || !selectedTimeSlot) {
      setMessage("Vælg venligst et tidsrum.");
      return;
    }

    try {
      const timeSlotTable = type.startsWith("opgaver") ? `time_slots${type.replace("opgaver", "")}` : "time_slots"; // Dynamic table reference

      // Fetch the time slot
      const { data: timeSlot, error: timeSlotError } = await supabase.from(timeSlotTable).select("*").eq("id", selectedTimeSlot).single();

      if (timeSlotError || !timeSlot) {
        console.error("Error fetching time slot:", timeSlotError);
        setMessage("Tidsrummet findes ikke. Prøv igen.");
        return;
      }

      if (timeSlot.current_volunteers >= timeSlot.max_volunteers) {
        setMessage("Dette tidsrum er allerede fuldt optaget.");
        return;
      }

      // Insert the volunteer
      const volunteerTable = type.startsWith("opgaver") ? `tilmeldte${type.replace("opgaver", "")}` : "tilmeldte"; // Dynamic volunteer table

      const { error: insertError } = await supabase.from(volunteerTable).insert([
        {
          name,
          email,
          phone,
          team_name: teamName,
          child_name: isParent ? childName : null,
          comment,
          task_id: id,
          time_slot_id: selectedTimeSlot,
        },
      ]);

      if (insertError) {
        console.error("Error during signup:", insertError);
        setMessage("Der opstod en fejl. Prøv igen.");
        return;
      }

      // Update current_volunteers
      await supabase
        .from(timeSlotTable)
        .update({ current_volunteers: timeSlot.current_volunteers + 1 })
        .eq("id", selectedTimeSlot);

      // Confetti
      confetti({
        scalar: 2,
        spread: 360,
        particleCount: 200,
        origin: { y: -0.1 },
        startVelocity: -35,
      });

      fetchTaskData();

      // Reset form fields
      setName("");
      setEmail("");
      setPhone("");
      setTeamName("");
      setChildName("");
      setComment("");
      setSelectedTimeSlot("");
      setMessage("Du er nu tilmeldt opgaven!");
    } catch (err) {
      console.error("Unexpected error during signup:", err);
      setMessage("Der opstod en fejl. Prøv igen.");
    }
  };

  const handleCopyTask = () => {
    if (!task) {
      console.error("Ingen opgave at kopiere.");
      return;
    }

    router.push({
      pathname: "/admin",
      query: {
        title: task.title,
        shortDescription: task.short_description,
        description: task.description,
        date: task.date,
        neededVolunteers: task.needed_volunteers,
        timeSlots: JSON.stringify(timeSlots), // Konverter tidsrum til string
      },
    });
  };

  const handleEditClick = () => {
    if (!task) return;
    router.push({
      pathname: "/admin",
      query: {
        id: task.id,
        type,
      },
    });
  };

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("da-DK", options).format(new Date(dateString));
  };

  if (loading) {
    return <div className="p-8">Indlæser...</div>;
  }

  if (!task) {
    return <div className="p-8">Opgaven blev ikke fundet.</div>;
  }

  return (
    <>
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }

          /* Gør tabellen fuldbredde og tekst kompakt */
          table {
            width: 100%;
            font-size: 0.9em;
            table-layout: fixed;
          }
          th,
          td {
            white-space: nowrap;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          th {
            background-color: #f0f0f0;
          }
          /* Sikrer, at tekst brydes hvis nødvendigt */
          td {
            white-space: normal;
            word-break: break-word;
          }
        }
      `}</style>
      <Head>
        <title>Opgavedetaljer</title>
        <meta name="description" content="Få information om opgaven. Se tidsrum, behovet for frivillige og tilmeld dig for at hjælpe med praktiske opgaver." />
      </Head>
      <div className="md:p-16 mt-32 md:mt-12 min-h-screen ">
        <h1 className="text-5xl text-center mt-7 font-bebas font-bold text-bono-10 md:mb-16 md:mt-8 mb-3">Opgave Detaljer</h1>
        <div className="md:flex justify-evenly">
          <div className="flex p-6 flex-col md:flex-row justify-around gap-8 mb-8">
            <div className="flex-row max-w-2xl">
              <div className="flex justify-between">
                <h2 className="text-2xl font-bold text-bono-10 mb-2">{task.title}</h2>
              </div>
              <p className="text-gray-600 text-lg">{formatDate(task.date)}</p>
              <p className="text-gray-600 text-lg">Adresse: {task.address || "Adresse ikke angivet"}</p>

              <p className="text-gray-700 mt-6 text-lg mb-4">{task.description}</p>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Tilgængelige Tidsrum</h3>
              <ul className="list-disc ml-4 text-gray-700">
                {timeSlots.map((slot) => (
                  <li key={slot.id}>
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)} ({slot.available_spots} ledige)
                  </li>
                ))}
              </ul>
              {isLoggedIn && (
                <div className=" mt-12 flex gap-4 text-sm">
                  <button onClick={handleCopyTask} className=" bg-taupe-10 border border-gray-700 print:hidden text-bono-10 px-4 py-2 rounded">
                    Kopier Opgave
                  </button>
                  <button onClick={handleEditClick} className=" print:hidden border border-gray-700 text-bono-10 px-4 py-2 rounded">
                    Rediger Opgave
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-knap-10  print:hidden border border-gray-600 mb-12 w-11/12 ml-4 p-5 md:w-1/4 rounded-lg  shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Tilmeld dig opgaven</h2>
            {message && <p className="text-green-600 font-bold mb-4">{message}</p>}
            <form onSubmit={handleSubmit} className=" space-y-4">
              <div>
                <label className=" text-bono-10">Navn</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn" className="block w-full bg-knap-10 text-bono-10 border border-gray-700 rounded p-2" required />
              </div>
              <div>
                <label className=" text-bono-10">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="block w-full bg-knap-10 text-bono-10 border border-gray-700 rounded p-2" required />
              </div>
              <div>
                <label className=" text-bono-10">Telefon nr</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefonnummer" className="block w-full bg-knap-10 text-bono-10 border border-gray-700 rounded p-2" required />
              </div>
              <div className="mt-4 flex gap-4">
                <label className="inline-flex items-center">
                  <input type="radio" name="role" checked={isParent} onChange={() => setIsParent(true)} className="form-radio text-blue-500" />
                  <span className="ml-2 text-gray-700">Forælder</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="role" checked={!isParent} onChange={() => setIsParent(false)} className="form-radio text-blue-500" />
                  <span className="ml-2 text-gray-700">Gymnast</span>
                </label>
              </div>
              {isParent && (
                <>
                  <div>
                    <label className=" text-bono-10">Navn på barn</label>
                    <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Barnets navn" className="block w-full bg-knap-10 text-bono-10 border border-gray-700 rounded p-2" required />
                  </div>
                  <div>
                    <label className=" text-bono-10">Holdnavn</label>
                    <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Barnets hold" className="block w-full bg-knap-10 text-bono-10 border border-gray-700 rounded p-2" required />
                  </div>
                </>
              )}
              {!isParent && (
                <div>
                  <label className=" text-bono-10">Hold navn</label>
                  <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Mit hold" className="block w-full bg-knap-10 text-bono-10 border border-gray-700 rounded p-2" required />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Vælg Tidsrum:</label>
                <select value={selectedTimeSlot} onChange={(e) => setSelectedTimeSlot(e.target.value)} className="block w-full text-gray-700 border rounded p-2" aria-label="Vælg tidsrum" required>
                  <option value="">Vælg et tidsrum</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)} ({slot.available_spots} ledige)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className=" text-bono-10">Kommentar</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kommentar" className="block bg-knap-10 text-bono-10 border border-gray-700 w-full rounded p-2" />
              </div>
              <button type="submit" className="w-full bg-knap-10 font-semibold text-bono-10 p-2 rounded border border-gray-700 hover:bg-taupe-10">
                Tilmeld
              </button>
            </form>
          </div>
        </div>

        <div className="">
          <div className="p-6">
            {volunteers.length === 0 ? (
              <p className="text-gray-600">Mangler tilmeldte.</p>
            ) : (
              <div className="">
                <h2 className="md:text-2xl text-xl font-bold -mt-10 mb-4 text-bono-10 break-words">Tilmeldte til {task.title}</h2>
                <table className="table-fixed border-collapse border rounded border-gray-600 w-full text-sm md:text-base">
                  <thead>
                    <tr className="bg-knap-10">
                      <th className="border text-bono-10 border-gray-600 px-4 py-2 text-left">Navn</th>
                      {/*hvis brugeren er logget ind */}
                      {isLoggedIn && (
                        <>
                          <th className="border text-bono-10 border-gray-600 px-4 py-2 text-left">Telefon</th>
                          <th className="border text-bono-10 border-gray-600 px-4 py-2 text-left">Email</th>
                          <th className="border text-bono-10 border-gray-600 px-4 py-2 text-left">Hold</th>
                          <th className="border text-bono-10 border-gray-600 px-4 py-2 text-left">Barn</th>
                        </>
                      )}
                      <th className="border text-bono-10 border-gray-600 px-4 py-2 text-left">Tidsrum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers
                      .sort((a, b) => {
                        // Find tidsrummet for hver frivillig
                        const slotA = timeSlots.find((slot) => slot.id === a.time_slot_id);
                        const slotB = timeSlots.find((slot) => slot.id === b.time_slot_id);

                        const startA = slotA ? new Date(`1970-01-01T${slotA.start_time}`) : new Date(0);
                        const startB = slotB ? new Date(`1970-01-01T${slotB.start_time}`) : new Date(0);

                        // Sortér efter starttidspunkt
                        return startA - startB;
                      })
                      .map((volunteer, index) => (
                        <tr key={index} className="hover:bg-gray-100">
                          <td className="border text-bono-10 border-gray-600 px-4 py-2 text-left">{volunteer.name}</td>
                          {/* hvis brugeren er logget ind */}
                          {isLoggedIn && (
                            <>
                              <td className="border text-bono-10 border-gray-600 px-4 py-2 break-words text-left">{volunteer.phone || "N/A"}</td>
                              <td className="border text-bono-10 border-gray-600 px-4 py-2 break-words text-left">{volunteer.email || "N/A"}</td>
                              <td className="border text-bono-10 border-gray-600 px-4 py-2 text-left">{volunteer.team_name || "N/A"}</td>
                              <td className="border text-bono-10 border-gray-600 px-4 py-2 text-left">{volunteer.child_name || "N/A"}</td>
                            </>
                          )}
                          <td className="border text-bono-10 border-gray-600 px-4 py-2 text-left">
                            {formatTime(timeSlots.find((slot) => slot.id === volunteer.time_slot_id)?.start_time || "N/A")} - {formatTime(timeSlots.find((slot) => slot.id === volunteer.time_slot_id)?.end_time || "N/A")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {isLoggedIn && (
                  <div className="flex print:hidden justify-start mt-6 group">
                    <button onClick={() => window.print()} className="relative flex justify-center items-center w-40 h-12 px-6 rounded-xl border-2 overflow-hidden text-bono-10 bg-knap-10 border-gray-500 hover:border-blue-600">
                      {/* Primær tekst */}
                      <span className="absolute top-1/2 left-0 right-0 text-center transform -translate-y-1/2 transition-all duration-200 ease-in-out group-hover:-translate-y-[250%] text-lg md:text-xl font-bold">Print Tabel</span>
                      {/* Sekundær tekst */}
                      <span className="absolute top-full left-0 right-0 text-center transform translate-y-0 transition-all duration-200 ease-in-out group-hover:translate-y-[-130%] text-lg md:text-xl font-bold">Print Tabel!</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
