"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import useSound from "use-sound";

/* mapping: animation key → GIF filename */
const GIFS = {
  idle: "/cat/idle.gif",
  feed: "/cat/feed.gif",
  bath: "/cat/bath.gif",
  pet:  "/cat/pet.gif",
  play: "/cat/play.gif",
};
/* helper – price deducts via new spend_coins(), coins refresh after */


export default function Pet({ room = "default" }) {
  /* live DB state */
  const [pet,   setPet]   = useState({ hunger: 100, happiness: 100, cleanliness: 100, born_at: new Date() });
  const [coins, setCoins] = useState(0);
  const [anim,  setAnim]  = useState("idle");

  /* sounds (optional MP3s in public/sounds/) */
  const [purr]  = useSound("/sounds/purr.mp3",  { volume: 0.4, soundEnabled: true });
  const [meow]  = useSound("/sounds/meow.mp3",  { volume: 0.7, soundEnabled: true });
  const [munch] = useSound("/sounds/munch.mp3", { volume: 0.6, soundEnabled: true });

  /* initial fetch + realtime subscription */
  useEffect(() => {
    refreshPet();
    refreshCoins();

    const ch = supabase
      .channel(`cat:${room}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "cat", filter: `room=eq.${room}` },
          payload => setPet(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [room]);

  const refreshPet   = () =>
    supabase.from("cat").select("*").eq("room", room).single()
      .then(({ data }) => data && setPet(data));

  const refreshCoins = () =>
    supabase.rpc("coins_for_room", { _room: room })
      .then(({ data }) => setCoins(data || 0));

  /* decay each minute */
  useEffect(() => {
    const id = setInterval(() => {
      supabase.from("cat").update({
        hunger:      Math.max(pet.hunger      - 1, 0),
        happiness:   Math.max(pet.happiness   - 1, 0),
        cleanliness: Math.max(pet.cleanliness - 1, 0),
        updated_at:  new Date(),
      }).eq("room", room);
    }, 60000);
    return () => clearInterval(id);
  }, [pet, room]);
    
    const coinPoll = useRef(null);
    useEffect(() => {
      coinPoll.current = setInterval(() => {
        refreshCoins();          // same helper you already call after an action
      }, 2000);
      return () => clearInterval(coinPoll.current);
    }, [room]);
    /* helper: spend coins via ledger only */
    const act = useCallback(async ({ field, delta, price, key, sound }) => {
      const { data: bal } = await supabase.rpc("coins_for_room", { _room: room });
      if ((bal ?? 0) < price) { alert("Not enough coins!"); return; }

      await supabase.from("cat")
        .update({ [field]: Math.min(pet[field] + delta, 100), updated_at: new Date() })
        .eq("room", room);

      await supabase.rpc("spend_coins", { _room: room, _price: price });

      setAnim(key);
      sound();
      setTimeout(() => setAnim("idle"), 10000);
    }, [pet, room]);


  const ageDays = Math.floor((Date.now() - new Date(pet.born_at)) / 86400000);

  return (
    <div className="w-full max-w-md text-center space-y-6">
      <h1 className="text-2xl font-bold">Virtual Cat — age {ageDays} d</h1>

      <Meter label="Hunger"      value={pet.hunger}      color="bg-red-400"   />
      <Meter label="Happiness"   value={pet.happiness}   color="bg-yellow-400"/>
      <Meter label="Cleanliness" value={pet.cleanliness} color="bg-blue-400"  />

      {/* GIF (320 × 320 px) */}
          <motion.img
            key={anim}
            src={GIFS[anim] ?? GIFS.idle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            alt={anim}
            className="w-[320px] h-[320px] mx-auto object-contain"
            style={{ imageRendering: "pixelated" }}   /* ← keeps pixels sharp */
          />

      <div>Coins available: <span className="font-semibold">{coins}</span></div>

      <div className="grid grid-cols-2 gap-3">
        <Action label="Feed (5)"
          onClick={() => act({ field:"hunger",      delta:20, price:5, key:"feed", sound:munch })}/>
        <Action label="Pet (2)"
          onClick={() => act({ field:"happiness",   delta:10, price:2, key:"pet",  sound:purr  })}/>
        <Action label="Play (3)"
          onClick={() => act({ field:"happiness",   delta:15, price:3, key:"play", sound:meow  })}/>
        <Action label="Bathe (4)"
          onClick={() => act({ field:"cleanliness", delta:20, price:4, key:"bath", sound:meow  })}/>
      </div>
    </div>
  );
}

/* helpers */
function Meter({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span><span>{value}%</span>
      </div>
      <div className="h-3 bg-gray-300 rounded">
        <div className={`h-full ${color} rounded`} style={{ width:`${value}%` }} />
      </div>
    </div>
  );
}
function Action({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded">
      {label}
    </button>
  );
}
