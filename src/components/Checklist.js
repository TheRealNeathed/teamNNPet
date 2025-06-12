"use client";
import { useEffect, useState, useRef, memo } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Checklist({ side, bgColor, label, room = "default" }) {
  const [tasks , setTasks ] = useState([]);
  const [coins , setCoins ] = useState(0);      // ← dedicated balance state
  const [title , setTitle ] = useState("");
  const [reward, setReward] = useState("");

  /* ── one-shot initial fetch */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("room", room)
        .eq("side", side)
        .eq("archived", false)
        .order("created_at");
      setTasks(data || []);
      refreshCoins();
    })();
  }, [room, side]);

  /* ── polling every second (keeps UI fresh) */
  const poll = useRef(null);
  useEffect(() => {
    poll.current = setInterval(() => {
      supabase        // refresh tasks (visible ones only)
        .from("tasks")
        .select("*")
        .eq("room", room)
        .eq("side", side)
        .eq("archived", false)
        .order("created_at")
        .then(({ data }) => setTasks(data || []));

      refreshCoins(); // refresh global balance
    }, 1000);         // 1 s
    return () => clearInterval(poll.current);
  }, [room, side]);

  /* ── realtime tasks for this side (keeps list without reload) */
  useEffect(() => {
    const ch = supabase
      .channel(`tasks_${room}_${side}`)
      .on(
        "postgres_changes",
        { schema:"public", table:"tasks",
          filter:`room=eq.${room},side=eq.${side},archived=eq.false` },
        ({ eventType, new: nw, old }) => {
          setTasks(cur => {
            if (eventType==="INSERT") return [...cur, nw];
            if (eventType==="DELETE") return cur.filter(t => t.id !== old.id);
            if (eventType==="UPDATE")
              return nw.archived
                ? cur.filter(t => t.id !== nw.id)
                : cur.map(t => t.id === nw.id ? nw : t);
            return cur;
          });
          refreshCoins();          // task toggle changes balance
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [room, side]);

  /* ── helper to (re)calculate balance */
  const refreshCoins = async () => {
    const { data } = await supabase.rpc("coins_for_room", { _room: room });
    setCoins(data || 0);
  };

  /* ── CRUD helpers */
  const addTask = async () => {
    if (!title.trim() || +reward <= 0) return;
    await supabase.from("tasks").insert({ room, side, title: title.trim(), reward: +reward });
    setTitle(""); setReward("");
  };

     const toggleDone = async (t) => {
       // optimistic UI
       setTasks(cur => cur.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
       await supabase
         .from("tasks")
         .update({ done: !t.done })
         .eq("id", t.id)
         .throwOnError();
       refreshCoins();            // adjust balance right away
    };

  const removeTask = async id => {
    setTasks(cur => cur.filter(t => t.id !== id));     // optimistic hide
    await supabase.from("tasks").update({ archived:true }).eq("id", id);
    // balance stays, because row still contributes in coins_for_room()
  };

  /* ── UI ── */
  return (
    <div className={`flex flex-col h-full ${bgColor} p-6`}>
      <h2 className="text-2xl font-semibold mb-4">{label}</h2>
      <div className="mb-4">
        <span className="font-medium">Room Coins:</span>{" "}
        <span className="font-bold">{coins}</span>
      </div>

      <ul className="flex-1 overflow-y-auto space-y-2">
        {tasks.map(t => (
          <li key={t.id} className="flex justify-between bg-white rounded shadow px-3 py-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={t.done} onChange={() => toggleDone(t)} />
              <span className={t.done ? "line-through text-gray-400" : ""}>{t.title}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm bg-yellow-200 rounded px-2">{t.reward} 🪙</span>
              <button onClick={() => removeTask(t.id)} className="text-red-500">✕</button>
            </div>
          </li>
        ))}
      </ul>

      {/* memoised form keeps typing smooth */}
      <TaskForm
        title={title}  setTitle={setTitle}
        reward={reward} setReward={setReward}
        addTask={addTask}
      />
    </div>
  );
}

/* -------- memoised form component -------- */
const TaskForm = memo(function TaskForm({ title, setTitle, reward, setReward, addTask }) {
  return (
    <form onSubmit={e=>{e.preventDefault();addTask();}} className="mt-4 flex gap-2 text-sm">
      <input className="flex-1 border rounded px-2 py-1"
        placeholder="New task" value={title}
        onChange={e=>setTitle(e.target.value)} />
      <input className="w-20 border rounded px-2 py-1"
        type="number" min="1" placeholder="Coins"
        value={reward} onChange={e=>setReward(e.target.value)} />
      <button className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700">Add</button>
    </form>
  );
});
