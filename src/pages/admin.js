import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "/lib/supabaseClient";
import Head from "next/head";

export default function Admin() {
  const router = useRouter();
  const { id, type } = router.query; // Modtag id og type fra URL
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newEventImage, setNewEventImage] = useState(null); // Til at holde billedet
  const [editMode, setEditMode] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [eventSlug, setEventSlug] = useState("");

  const [tableOptions, setTableOptions] = useState([]); // Dynamisk liste over tabeller
  const [tableSelection, setTableSelection] = useState(""); // Default tabel
  const [originalTable, setOriginalTable] = useState(null); // Gem original tabel
  const [newTableName, setNewTableName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventlongDescription, setNewEventlongDescription] = useState("");
  const [newEventImageUrl, setNewEventImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [neededVolunteers, setNeededVolunteers] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [maxVolunteers, setMaxVolunteers] = useState(0);
  const [address, setAddress] = useState("");

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

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

  const fetchTaskData = async () => {
    if (!id || !type) return;

    const taskTable = tableSelection || type;
    const timeSlotTable = taskTable.replace("opgaver", "time_slots");

    try {
      const { data: taskData, error: taskError } = await supabase.from(taskTable).select("*").eq("id", id).single();
      const { data: timeSlotsData, error: timeSlotsError } = await supabase.from(timeSlotTable).select("*").eq("task_id", id);

      if (taskError) {
        console.error("Task Error:", taskError);
        setError("Kunne ikke hente opgaven.");
        return;
      }

      setTitle(taskData.title || "");
      setShortDescription(taskData.short_description || "");
      setDescription(taskData.description || "");
      setDate(taskData.date || "");
      setNeededVolunteers(taskData.needed_volunteers || 0);
      setOriginalTable(taskTable);
      setAddress(taskData.address || "");

      if (timeSlotsError) {
        console.error("Time Slots Error:", timeSlotsError);
        setTimeSlots([]);
      } else {
        setTimeSlots(
          timeSlotsData.map((slot) => ({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            max_volunteers: slot.max_volunteers,
          }))
        );
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Uventet fejl ved hentning af opgaven.");
    }
  };

  useEffect(() => {
    if (id && type) {
      fetchTaskData();
    }
  }, [id, type]);

  useEffect(() => {
    const fetchTablesWithFriendlyNames = async () => {
      try {
        const { data: tablesData, error: tablesError } = await supabase.rpc("get_public_tables");
        if (tablesError) throw tablesError;

        const opgaveTables = tablesData.map((table) => table.tablename).filter((name) => name.startsWith("opgaver"));

        const tableDetails = await Promise.all(
          opgaveTables.map(async (tablename) => {
            // Hent den første række, der har et udfyldt image_url
            const { data, error } = await supabase
              .from(tablename)
              .select("friendly_name, image_url")
              .filter("image_url", "neq", null)
              .limit(1) // Begræns til 1 række for at få den første matchende række
              .single();

            if (data?.image_url) {
              return {
                tablename,
                friendly_name: data.friendly_name || tablename, // Brug friendly_name eller tablename som fallback
              };
            }
            return null; // Hvis image_url er tomt, returner null
          })
        );

        const filteredTableDetails = tableDetails.filter((table) => table !== null);

        setTableOptions(filteredTableDetails);

        // Sæt tableSelection kun én gang, baseret på `type`
        if (!tableSelection && type) {
          console.log("Initializing tableSelection with type from URL:", type);
          setTableSelection(type);
        }
      } catch (err) {
        console.error("Fejl ved hentning af tabeller:", err);
        setError("Kunne ikke hente tabeller.");
      }
    };

    fetchTablesWithFriendlyNames();
  }, [type]);

  const handleTableChange = (e) => {
    setTableSelection(e.target.value);
    setSuccess(`Du har valgt tabellen: ${e.target.value}`);
  };
  const createSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const createNewEventTables = async () => {
    // Log alle nødvendige felter før validering
    console.log("newEventName:", newEventName);
    console.log("newEventDate:", newEventDate);
    console.log("newEventDescription:", newEventDescription);
    console.log("newEventImageUrl:", newEventImageUrl);

    // Tjek om alle nødvendige felter er udfyldt
    if (!newEventName || !newEventDate || !newEventDescription || !newEventImageUrl) {
      setError("Alle felter skal udfyldes!");
      return;
    }

    try {
      let imageUrl = newEventImageUrl;

      //  Hent eksisterende tabeller og generér nye tabeller
      const { data: tablesData, error: tablesError } = await supabase.rpc("get_public_tables");
      if (tablesError) throw new Error("Kunne ikke hente eksisterende tabeller: " + tablesError.message);

      const eventTables = tablesData.map((table) => table.tablename).filter((name) => name.startsWith("opgaver"));

      const nextNumber =
        eventTables.reduce((max, name) => {
          const match = name.match(/\d+$/);
          return Math.max(max, match ? parseInt(match[0], 10) : 0);
        }, 0) + 1;

      const newOpgaverTable = `opgaver${nextNumber}`;
      const newTimeSlotsTable = `time_slots${nextNumber}`;
      const newTilmeldteTable = `tilmeldte${nextNumber}`;

      const slug = createSlug(newEventName);

      // SQL for at oprette de nye tabeller
      const createOpgaverTableSQL = `
    CREATE TABLE ${newOpgaverTable} (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      friendly_name text,
      slug text UNIQUE,
      event_date date,
      image_url text,
      event_description text,
      event_longdescription text,
      title text,
      short_description text,
      description text,
      needed_volunteers int,
      date date,
      isHidden boolean DEFAULT false,
      address text,
      "order" bigint DEFAULT 0
    );
  `;

      const createTimeSlotsTableSQL = `
    CREATE TABLE ${newTimeSlotsTable} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES ${newOpgaverTable}(id) ON DELETE CASCADE,
      start_time TIME,
      end_time TIME,
      max_volunteers INT,
      current_volunteers INT DEFAULT 0
    );
  `;

      const createTilmeldteTableSQL = `
    CREATE TABLE ${newTilmeldteTable} (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      time_slot_id uuid REFERENCES ${newTimeSlotsTable}(id) ON DELETE CASCADE,
      volunteer_id int,
      name text,
      email text,
      phone text,
      comment text,
      task_id uuid REFERENCES ${newOpgaverTable}(id) ON DELETE CASCADE,
      isparent bool,
      child_name text,
      team_name text
    );
  `;

      // Opret tabellerne
      const createCommands = [createOpgaverTableSQL, createTimeSlotsTableSQL, createTilmeldteTableSQL];
      for (const command of createCommands) {
        const { error: sqlError } = await supabase.rpc("run_raw_sql", { sql: command });
        if (sqlError) {
          console.error("Fejl ved oprettelse af tabel:", sqlError);
          throw new Error(`Fejl ved oprettelse af tabel: ${sqlError.message}`);
        }
      }

      //  Indsæt eventet i den nye opgaver-tabel
      const { error: insertError } = await supabase.from(newOpgaverTable).insert({
        friendly_name: newEventName,
        slug,
        event_date: newEventDate,
        image_url: imageUrl, // Brug den genererede billede-URL her
        event_description: newEventDescription,
        event_longdescription: newEventlongDescription,
        address,
        order: 0,
      });

      if (insertError) {
        console.error("Indsættelse af event fejlede:", insertError);
        throw new Error(`Fejl ved indsættelse af event: ${insertError.message}`);
      }

      setSuccess(`Event "${newEventName}" oprettet med succes!`);
      setError(null);
      setNewEventName("");
      setNewEventDate("");
      setNewEventDescription("");
      setNewEventImageUrl("");
      setAddress("");
    } catch (err) {
      console.error("Fejl:", err);
      setError(err.message || "Kunne ikke oprette eventet.");
      setSuccess(null);
    }
  };

  // Funktion til at tjekke om billedet allerede findes i Supabase
  const checkIfImageExists = async (filePath) => {
    const { data, error } = await supabase.storage.from("Photos").getPublicUrl(filePath);

    if (error) {
      console.error("Fejl ved at tjekke billede:", error);
      return false;
    }

    return data?.publicUrl !== null;
  };

  useEffect(() => {
    if (type) {
      setTableSelection(type);
      setOriginalTable(type);
    }
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Hvis der er et id, skal vi opdatere eller flytte opgaven til en ny tabel
      if (id) {
        if (tableSelection !== originalTable) {
          // Flyt opgaven til en ny tabel
          const { data: newTask, error: insertError } = await supabase
            .from(tableSelection)
            .insert({
              title,
              short_description: shortDescription,
              description,
              date,
              needed_volunteers: neededVolunteers,
              address,
              image_url: newEventImageUrl || null,
            })
            .select("id")
            .single();

          if (insertError) throw new Error("Fejl ved flytning af opgave: " + insertError.message);

          // Behandl tidsrum og tilmeldte
          const timeSlotTable = tableSelection.replace("opgaver", "time_slots");
          const oldTimeSlotTable = originalTable.replace("opgaver", "time_slots");
          const volunteerTable = tableSelection.replace("opgaver", "tilmeldte");
          const oldVolunteerTable = originalTable.replace("opgaver", "tilmeldte");

          // Flyt tidsrum
          const timeSlotsData = timeSlots.map((slot) => ({
            task_id: newTask.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            max_volunteers: slot.max_volunteers,
            current_volunteers: slot.current_volunteers || 0,
          }));

          const { data: newTimeSlots, error: insertTimeSlotsError } = await supabase.from(timeSlotTable).insert(timeSlotsData).select("id");
          if (insertTimeSlotsError) throw new Error("Fejl ved indsættelse af nye tidsrum: " + insertTimeSlotsError.message);

          // Hent gamle tilmeldte
          const { data: oldVolunteers, error: fetchVolunteersError } = await supabase
            .from(oldVolunteerTable)
            .select("*")
            .in(
              "time_slot_id",
              timeSlots.map((slot) => slot.id)
            );

          if (fetchVolunteersError) throw new Error("Fejl ved hentning af tilmeldte: " + fetchVolunteersError.message);

          if (oldVolunteers && oldVolunteers.length > 0) {
            // Match gamle tidsrum med nye tidsrum for opdatering af time_slot_id
            const timeSlotIdMap = timeSlots.reduce((map, oldSlot, index) => {
              map[oldSlot.id] = newTimeSlots[index].id;
              return map;
            }, {});

            const updatedVolunteers = oldVolunteers.map((volunteer) => ({
              ...volunteer,
              time_slot_id: timeSlotIdMap[volunteer.time_slot_id],
              task_id: newTask.id,
            }));

            // Flyt tilmeldte til den nye tabel
            const { error: insertVolunteersError } = await supabase.from(volunteerTable).insert(updatedVolunteers);
            if (insertVolunteersError) throw new Error("Fejl ved indsættelse af tilmeldte i ny tabel: " + insertVolunteersError.message);
          }

          // Slet gamle tilmeldte
          const { error: deleteOldVolunteersError } = await supabase
            .from(oldVolunteerTable)
            .delete()
            .in(
              "time_slot_id",
              timeSlots.map((slot) => slot.id)
            );
          if (deleteOldVolunteersError) throw new Error("Fejl ved sletning af tilmeldte fra gammel tabel: " + deleteOldVolunteersError.message);

          // Slet gamle tidsrum
          const { error: deleteTimeSlotsError } = await supabase.from(oldTimeSlotTable).delete().eq("task_id", id);
          if (deleteTimeSlotsError) throw new Error("Fejl ved sletning af tidsrum fra gammel tabel: " + deleteTimeSlotsError.message);

          // Slet gammel opgave
          const { error: deleteTaskError } = await supabase.from(originalTable).delete().eq("id", id);
          if (deleteTaskError) throw new Error("Fejl ved sletning af opgave fra gammel tabel: " + deleteTaskError.message);
        } else {
          // Opdater i den samme tabel
          const { error } = await supabase
            .from(tableSelection)
            .update({
              title,
              short_description: shortDescription,
              description,
              date,
              needed_volunteers: neededVolunteers,
              address,
              image_url: newEventImageUrl || null,
            })
            .eq("id", id);

          if (error) throw new Error("Fejl ved opdatering af opgave: " + error.message);

          const timeSlotTable = tableSelection.replace("opgaver", "time_slots");
          for (const slot of timeSlots) {
            if (slot.id) {
              const { error: timeSlotError } = await supabase
                .from(timeSlotTable)
                .update({
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  max_volunteers: slot.max_volunteers,
                })
                .eq("id", slot.id);

              if (timeSlotError) throw new Error("Fejl ved opdatering af tidsrum: " + timeSlotError.message);
            } else {
              const { error: newSlotError } = await supabase.from(timeSlotTable).insert({
                task_id: id,
                start_time: slot.start_time,
                end_time: slot.end_time,
                max_volunteers: slot.max_volunteers,
                current_volunteers: 0,
              });

              if (newSlotError) throw new Error("Fejl ved oprettelse af nyt tidsrum: " + newSlotError.message);
            }
          }
        }
      } else {
        // Opret ny opgave
        const { data: newTask, error: taskError } = await supabase
          .from(tableSelection)
          .insert({
            title,
            short_description: shortDescription,
            description,
            date,
            needed_volunteers: neededVolunteers,
            address,
            image_url: newEventImageUrl || null,
          })
          .select("id")
          .single();

        if (taskError) throw new Error("Fejl ved oprettelse af opgave: " + taskError.message);

        const timeSlotTable = tableSelection.replace("opgaver", "time_slots");
        const timeSlotsData = timeSlots.map((slot) => ({
          task_id: newTask.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          max_volunteers: slot.max_volunteers,
        }));

        const { error: timeSlotInsertError } = await supabase.from(timeSlotTable).insert(timeSlotsData);
        if (timeSlotInsertError) throw new Error("Fejl ved oprettelse af tidsrum: " + timeSlotInsertError.message);
      }

      setSuccess("Opgave gemt!");
      setError(null);
      router.push("/admin");
    } catch (err) {
      console.error(err.message);
      setError(err.message);
      setSuccess(null);
    }
  };

  const addTimeSlot = () => {
    if (newStartTime && newEndTime && maxVolunteers > 0) {
      const temporaryId = `temp-${Date.now()}`; // Generer et midlertidigt unikt ID
      setTimeSlots([
        ...timeSlots,
        {
          id: temporaryId, // Tilføj det midlertidige ID
          start_time: newStartTime,
          end_time: newEndTime,
          max_volunteers: maxVolunteers,
        },
      ]);
      setNewStartTime("");
      setNewEndTime("");
      setMaxVolunteers(0);
      setError(null);
    } else {
      setError("Udfyld alle felter for tidsrum korrekt.");
    }
  };

  const deleteTimeSlot = async (slotId) => {
    const confirmDelete = window.confirm("Er du sikker på, at du vil slette dette tidsrum?");
    if (!confirmDelete) return;

    try {
      // Tjek om tidsrummet er midlertidigt (id starter med "temp-")
      if (typeof slotId === "string" && slotId.startsWith("temp-")) {
        console.log("Fjerner midlertidigt tidsrum:", slotId);
        setTimeSlots((prevSlots) => prevSlots.filter((slot) => slot.id !== slotId));
        return;
      }

      // Slet fra databasen for eksisterende tidsrum
      const timeSlotTable = tableSelection?.startsWith("opgaver") ? `time_slots${tableSelection.replace("opgaver", "")}` : null;

      if (!timeSlotTable) {
        throw new Error("Kunne ikke bestemme tidsrummets tabel. Sletning annulleret.");
      }

      const { error } = await supabase.from(timeSlotTable).delete().eq("id", slotId);

      if (error) {
        throw new Error("Fejl ved sletning af tidsrum: " + error.message);
      }

      // Fjern tidsrum fra UI
      setTimeSlots((prevSlots) => prevSlots.filter((slot) => slot.id !== slotId));
      setSuccess("Tidsrum slettet.");
    } catch (err) {
      console.error("Fejl ved sletning af tidsrum:", err.message);
      setError(err.message);
    }
  };
  useEffect(() => {
    const { title, shortDescription, description, date, neededVolunteers, timeSlots, address, type } = router.query;

    if (title) setTitle(title);
    if (shortDescription) setShortDescription(shortDescription);
    if (description) setDescription(description);
    if (date) setDate(date);
    if (neededVolunteers) setNeededVolunteers(parseInt(neededVolunteers, 10));
    if (timeSlots) setTimeSlots(JSON.parse(timeSlots || "[]"));
    if (address) setAddress(address);

    if (type) {
      console.log("Setting table type to:", type);
      setTableSelection(type); // Sæt tabel baseret på `type`
      setOriginalTable(type); //  gem den originale tabel
    }
  }, [router.query, type]);

  // Håndter billedeændring
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewEventImage(file);
    }
  };

  // billede-upload
  const handleUploadImage = async () => {
    if (!newEventImage) {
      setError("Vælg venligst et billede først!");
      return;
    }

    try {
      const filePath = `public/${newEventImage.name}`;
      const { data, error: uploadError } = await supabase.storage.from("Photos").upload(filePath, newEventImage);

      if (uploadError) {
        console.error("Upload fejlede:", uploadError);
        throw new Error("Fejl ved upload af billede: " + uploadError.message);
      }

      const imageUrl = `https://kuzyorqkbgxojqeeznfm.supabase.co/storage/v1/object/Photos/${filePath}`;

      console.log("Manuel URL:", imageUrl);

      setNewEventImageUrl(imageUrl);
      setError(null);
      setSuccess("Billede uploadet og URL genereret!");
    } catch (err) {
      console.error("Fejl:", err.message);
      setError(err.message);
      setSuccess(null);
    }
  };

  useEffect(() => {
    // Hent URL-parameterne
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("id");
    const friendlyName = urlParams.get("friendly_name");
    const eventDate = urlParams.get("event_date");
    const eventDescription = urlParams.get("event_description");
    const eventLongDescription = urlParams.get("event_longdescription");
    const addressParam = urlParams.get("address");
    const imageUrl = urlParams.get("image_url");
    const slugParam = urlParams.get("slug");

    // Hvis der er et eventId, er vi i editMode
    if (eventId) {
      setEditMode(true);
    }

    // Sæt de hentede værdier i formularens state
    setNewEventName(friendlyName || "");
    setNewEventDate(eventDate || "");
    setNewEventDescription(eventDescription || "");
    setNewEventlongDescription(eventLongDescription || "");
    setNewEventImageUrl(imageUrl || "");
    setAddress(addressParam || "");
    setSlug(slugParam || "");
  }, []);

  const saveEventChanges = async () => {
    try {
      if (editMode) {
        const eventId = new URLSearchParams(window.location.search).get("id");

        // Hent alle tabeller, der starter med 'opgaver'
        const { data: tablesData, error: tablesError } = await supabase.rpc("get_public_tables");
        if (tablesError) {
          setError("Kunne ikke hente tabeller: " + tablesError.message);
          return;
        }

        // Filtrer tabeller, der starter med 'opgaver'
        const eventTables = tablesData.map((table) => table.tablename).filter((name) => name.startsWith("opgaver"));

        // find eventet ved ID
        let eventFound = false;
        for (let table of eventTables) {
          const { data, error } = await supabase
            .from(table)
            .select("id")
            .eq("id", eventId) // Tjek for event-id i den aktuelle tabel
            .single();

          if (data) {
            // Hvis eventet findes i tabellen, opdater det
            const { error: updateError } = await supabase
              .from(table)
              .update({
                friendly_name: newEventName,
                event_date: newEventDate,
                event_description: newEventDescription,
                event_longdescription: newEventlongDescription,
                address: address,
                image_url: newEventImageUrl,
              })
              .eq("id", eventId);
            if (updateError) {
              setError("Fejl ved opdatering af event: " + updateError.message);
              return;
            }

            setSuccess("Event opdateret i tabellen " + table);
            eventFound = true;
            break;
          }
        }

        if (!eventFound) {
          setError("Eventet blev ikke fundet i nogen tabel.");
        }
      } else {
        // Hvis vi ikke er i editMode, opret et nyt event
        await createNewEventTables();
      }
    } catch (err) {
      setError("Fejl ved oprettelse eller ændring af event.");
      console.error(err);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      <Head>
        <title>adminstrator side</title>
        <meta name="description" content="Administrationspanel for oprettelse, redigering og styring af events og opgaver. Kun for autoriserede brugere." />
      </Head>
      <div className="p-8 justify-evenly mt-24 md:flex min-h-screen">
        <div className="">
          <h1 className="text-3xl text-center font-bold mb-6 text-gray-700">{id ? "Rediger Opgave" : "Tilføj en opgave i et Event"}</h1>
          <div className="flex items-center justify-center">
            <form onSubmit={handleSubmit} className="bg-knap-10 border text-bono-10 border-gray-600 p-6 rounded w-full max-w-md">
              {success && <p className="text-bono-10 mb-4">{success}</p>}
              {error && <p className="text-red-500 mb-4">{error}</p>}

              <label className="block font-semibold text-bono-10 mb-4">
                Vælg tabel:
                <select
                  value={tableSelection}
                  onChange={(e) => {
                    const selectedTable = e.target.value;
                    console.log("Dropdown changed to:", selectedTable);
                    setTableSelection(selectedTable);
                  }}
                  className="w-full border rounded p-2"
                >
                  {tableOptions.map(({ tablename, friendly_name }) => (
                    <option key={tablename} value={tablename}>
                      {friendly_name ? friendly_name : tablename}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block font-semibold text-bono-10 mb-4">
                Titel:
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-knap-10 border text-bono-10 border-gray-600 rounded p-2" required />
              </label>
              <label className="block font-semibold text-bono-10 mb-4">
                Kort Beskrivelse:
                <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full bg-knap-10 border text-bono-10 border-gray-600 rounded" required />
              </label>
              <label className="block font-semibold text-bono-10 mb-4">
                Beskrivelse:
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-knap-10 border text-bono-10 border-gray-600 rounded" required />
              </label>
              <label className="block font-semibold text-bono-10 mb-4">
                Dato:
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-knap-10 border text-bono-10 border-gray-600 rounded p-2" required />
              </label>
              <label className="block font-semibold text-bono-10 mb-4">
                Adresse:
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-knap-10 border text-bono-10 border-gray-600 rounded p-2" required />
              </label>

              <label className="block font-semibold text-bono-10 mb-4">
                Antal Frivillige:
                <input type="number" value={neededVolunteers} onChange={(e) => setNeededVolunteers(Number(e.target.value))} className="w-full bg-knap-10 border text-bono-10 border-gray-600 rounded p-2" min="1" required />
              </label>

              <div className="mb-4">
                <label className="block font-semibold text-bono-10 mb-2">Tidsrum:</label>
                <div className="grid gap-2 mb-2">
                  <label>
                    Start-tid
                    <input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="bg-knap-10 border text-bono-10 w-full border-gray-600 rounded p-2" />
                  </label>
                  <label>
                    Slut-tid
                    <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className="bg-knap-10 border text-bono-10  w-full border-gray-600 rounded p-2" />
                  </label>
                  <label>
                    Antal Frivillige
                    <input type="number" value={maxVolunteers} onChange={(e) => setMaxVolunteers(Number(e.target.value))} className="bg-knap-10 border text-bono-10 w-full border-gray-600 rounded p-2" min="1" />
                  </label>
                  <button type="button" onClick={addTimeSlot} className="bg-knap-10 text-bono-10 border border-gray-700 font-semibold px-4 hover:bg-taupe-10 rounded">
                    Tilføj
                  </button>
                </div>
                <ul>
                  {timeSlots.map((slot, index) => (
                    <li key={index} className="flex justify-between items-center text-bono-10 mb-2">
                      {slot.start_time} - {slot.end_time} ({slot.max_volunteers} frivillige)
                      <button type="button" onClick={() => deleteTimeSlot(slot.id)} className="text-red-500 ml-4">
                        Slet
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <button type="submit" className="bg-knap-10 text-bono-10 border border-gray-700 font-semibold hover:bg-taupe-10 px-4 py-2 rounded w-full">
                {id ? "Opdater Opgave" : "Opret Opgave"}
              </button>
            </form>
          </div>
        </div>
        <div>
          <div className="flex-col min-h-screen  justify-center">
            <h2 className="text-3xl font-semibold text-bono-10 md:mt-0 mt-10 mb-6">Opret et nyt Event</h2>
            <form className="bg-knap-10 border text-bono-10 max-w-96 h-fit border-gray-700 p-6 rounded">
              <label className="block text-bono-10 font-semibold mb-4">
                Eventnavn:
                <input type="text" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} className="w-full bg-knap-10 border border-gray-700 text-bono-10 rounded p-2" placeholder="" required />
              </label>
              <label className="block text-bono-10 font-semibold mb-4">
                Eventdato:
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="w-full bg-knap-10 border border-gray-700 text-bono-10 rounded p-2" required />
              </label>
              <label className="block text-bono-10 font-semibold mb-4">
                Kort Eventbeskrivelse:
                <textarea value={newEventDescription} onChange={(e) => setNewEventDescription(e.target.value)} className="w-full bg-knap-10 border border-gray-700 text-bono-10 rounded p-2" placeholder="" required />
              </label>
              <label className="block text-bono-10 font-semibold mb-4">
                Lang Eventbeskrivelse:
                <textarea value={newEventlongDescription} onChange={(e) => setNewEventlongDescription(e.target.value)} className="w-full bg-knap-10 border border-gray-700 text-bono-10 rounded p-2" placeholder="" required />
              </label>
              <label className="block text-bono-10 font-semibold mb-4">
                Adresse:
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-knap-10 border border-gray-700 text-bono-10 rounded p-2" placeholder="" required />
              </label>

              <label className="block text-bono-10 font-semibold mb-4">
                Billede:
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full bg-knap-10 border border-gray-700 text-bono-10 rounded p-2" required />
              </label>

              {newEventImageUrl && <p className="text-gray-500 mt-2">Billed-URL: {newEventImageUrl}</p>}
              <div className="flex flex-col">
                <button type="button" onClick={handleUploadImage} className="btn btn-primary text-bono-10 font-semibold text-left">
                  Upload billede
                </button>
                <button type="button" onClick={editMode ? saveEventChanges : createNewEventTables} className="btn bg-knap-10 border-gray-700 border hover:bg-taupe-10 rounded py-1 font-semibold btn-primary mt-4">
                  {editMode ? "Gem Ændringer" : "Opret Event"}
                </button>
              </div>
              {success && <p className="text-bono-10 mt-4">{success}</p>}
              {error && <p className="text-red-500 mt-4">{error}</p>}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
