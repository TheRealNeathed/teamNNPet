"use client";
import { useEffect, useState, useRef, memo } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Checklist({ side, bgColor, label, room = "default" }) {
  /* local state */
  const [tasks , setTasks ] = useState([]);
  const [coins , setCoins ] = useState(0);
  const [title , setTitle ] = useState("");
  const [reward, setReward] = useState("");

  /* one-shot initial fetch */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("room", room).eq("side", side).eq("archived", false)
        .order("created_at");
      setTasks(data || []);
      refreshCoins();
    })();
  }, [room, side]);

  /* -------- POLLING every 1 s keeps UI fresh -------- */
  const pollRef = useRef(null);
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("room", room).eq("side", side).eq("archived", false)
        .order("created_at");
      setTasks(data || []);
      refreshCoins();
    }, 1000);
    return () => clearInterval(pollRef.current);
  }, [room, side]);

  /* helper: global coin balance */
  const refreshCoins = async () => {
    const { data } = await supabase.rpc("coins_for_room", { _room: room });
    setCoins(data || 0);
  };

  /* CRUD helpers */
  const addTask = async () => {
    if (!title.trim() || +reward <= 0) return;
    await supabase.from("tasks").insert({ room, side, title: title.trim(), reward:+reward });
    setTitle(""); setReward("");
  };

  const toggleDone = async (t) => {
    setTasks(cur => cur.map(x => x.id===t.id ? { ...x, done:!x.done } : x)); // optimistic
    await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
    refreshCoins();
  };

  const removeTask = async (id) => {
    setTasks(cur => cur.filter(t => t.id !== id));              // optimistic hide
    await supabase.from("tasks").update({ archived:true }).eq("id", id);
  };

  /* UI */
  return (
    <div className={`flex flex-col h-full ${bgColor} p-6`}>
      <h2 className="text-2xl font-semibold mb-4">{label}</h2>
      <div className="mb-4"><span className="font-medium">Room Coins:</span>{" "}
        <span className="font-bold">{coins}</span></div>

      <ul className="flex-1 overflow-y-auto space-y-2">
        {tasks.map(t=>(
          <li key={t.id} className="flex justify-between bg-white rounded shadow px-3 py-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={t.done} onChange={()=>toggleDone(t)} />
              <span className={t.done?"line-through text-gray-400":""}>{t.title}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm bg-yellow-200 rounded px-2">{t.reward} 🪙</span>
              <button onClick={()=>removeTask(t.id)} className="text-red-500">✕</button>
            </div>
          </li>
        ))}
      </ul>

      <TaskForm
        title={title}  setTitle={setTitle}
        reward={reward} setReward={setReward}
        addTask={addTask}
      />
    </div>
  );
}

/* memoised form keeps typing smooth */
const TaskForm = memo(function TaskForm({ title, setTitle, reward, setReward, addTask }) {
  return (
    <form onSubmit={e=>{e.preventDefault();addTask();}} className="mt-4 flex gap-2 text-sm">
      <input className="flex-1 border rounded px-2 py-1" placeholder="New task"
        value={title} onChange={e=>setTitle(e.target.value)} />
      <input className="w-20 border rounded px-2 py-1" type="number" min="1" placeholder="Coins"
        value={reward} onChange={e=>setReward(e.target.value)} />
      <button className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700">Add</button>
    </form>
  );
});
