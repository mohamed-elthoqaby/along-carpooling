"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { BadgeCheck, MessageCircle, Send } from "lucide-react";

interface ChatRoomSummary {
  id: string;
  ride: {
    id: string;
    originName: string;
    destName: string;
    departureTime: string;
  };
  driver: { id: string; name: string; kycStatus: string };
  passenger: { id: string; name: string; kycStatus: string };
  messages: Array<{ body: string; createdAt: string }>;
}

interface ChatMsg {
  id: string;
  senderId: string | null;
  body: string;
  isSystem: boolean;
  createdAt: string;
  sender: { id: string; name: string } | null;
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get("roomId");

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) {
      router.push("/login");
      return;
    }
    const { user } = await meRes.json();
    setMyUserId(user.id);

    const res = await fetch("/api/chats");
    if (res.ok) {
      const data = await res.json();
      const list: ChatRoomSummary[] = data.rooms ?? [];
      setRooms(list);
      setActiveRoomId((prev) => prev ?? list[0]?.id ?? null);
    }
    setLoading(false);
  }, [router]);

  const loadMessages = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/chats/${roomId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!activeRoomId) return;
    loadMessages(activeRoomId);
    const interval = setInterval(() => loadMessages(activeRoomId), 3000);
    return () => clearInterval(interval);
  }, [activeRoomId, loadMessages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!activeRoomId || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const res = await fetch(`/api/chats/${activeRoomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      loadMessages(activeRoomId);
    }
  }

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-[#5E6878]">
        Loading messages...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-[#050412]">Trip Messages</h1>
        <p className="text-sm text-[#5E6878]">
          1-to-1 trip coordination between drivers and passengers.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Rooms List */}
        <div className="along-card overflow-hidden">
          <div className="border-b border-[#DCE3EE] bg-[#F7F9FC] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#5E6878]">
            Conversations ({rooms.length})
          </div>
          {rooms.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#5E6878]">
              No trip chats yet. Book a seat or message a driver from any ride
              page.
            </div>
          ) : (
            <div className="divide-y divide-[#E9EEF5]">
              {rooms.map((r) => {
                const other =
                  r.driver.id === myUserId ? r.passenger : r.driver;
                const active = r.id === activeRoomId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRoomId(r.id)}
                    className={`w-full px-4 py-3.5 text-left transition ${
                      active ? "bg-[#EBF5FF]" : "hover:bg-[#F7F9FC]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#050412]">
                        {other.name}
                      </span>
                      {other.kycStatus === "VERIFIED" && (
                        <BadgeCheck className="h-3.5 w-3.5 text-[#1E90FF]" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-[#1E90FF]">
                      {r.ride.originName} → {r.ride.destName}
                    </p>
                    {r.messages[0] && (
                      <p className="mt-1 truncate text-xs text-[#5E6878]">
                        {r.messages[0].body}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Thread */}
        <div className="along-card flex h-[500px] flex-col lg:col-span-2">
          {activeRoom ? (
            <>
              <div className="border-b border-[#DCE3EE] px-5 py-3.5">
                <p className="text-sm font-bold text-[#050412]">
                  {activeRoom.ride.originName} → {activeRoom.ride.destName}
                </p>
                <p className="text-xs text-[#5E6878]">
                  Departure:{" "}
                  {new Date(activeRoom.ride.departureTime).toLocaleString()}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.map((m) => {
                  if (m.isSystem) {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="inline-block rounded-full bg-[#EBF5FF] px-3 py-1 text-[11px] font-semibold text-[#1E90FF]">
                          {m.body}
                        </span>
                      </div>
                    );
                  }
                  const mine = m.senderId === myUserId;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-[16px] px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-[#1E90FF] text-white"
                            : "bg-[#E9EEF5] text-[#050412]"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? "text-white/75" : "text-[#5E6878]"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-[#DCE3EE] p-3"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 rounded-[12px] border border-[#DCE3EE] px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:outline-none"
                />
                <button
                  type="submit"
                  className="along-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[#5E6878]">
              <MessageCircle className="h-10 w-10 text-[#8DCCFF]" />
              <p className="mt-3 text-sm font-semibold text-[#050412]">
                Select a conversation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm text-[#5E6878]">
          Loading chat...
        </p>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
