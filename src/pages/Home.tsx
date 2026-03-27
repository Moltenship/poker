import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FIBONACCI, FIBONACCI_EXTENDED, isNumericCard } from "@/lib/cards";
import { useSessionMutation } from "@/hooks/useSession";
import { api } from "../../convex/_generated/api";

type RecentRoom = {
  roomCode: string;
  name: string;
  visitedAt: number;
};

export default function Home() {
  const navigate = useNavigate();
  const createRoom = useSessionMutation((api as any).rooms.createRoom);

  // Create Room State
  const [roomName, setRoomName] = useState("");
  const [cardSetType, setCardSetType] = useState<"fibonacci" | "extended" | "custom">("fibonacci");
  const [customCards, setCustomCards] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [createError, setCreateError] = useState("");

  // Join Room State
  const [joinCode, setJoinCode] = useState("");
  
  // Recent Rooms
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("poker_recent_rooms");
      if (stored) {
        setRecentRooms(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent rooms", e);
    }
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!roomName.trim()) {
      setCreateError("Room name is required.");
      return;
    }

    let cardSet: string[] = [];
    if (cardSetType === "fibonacci") {
      cardSet = FIBONACCI.values;
    } else if (cardSetType === "extended") {
      cardSet = FIBONACCI_EXTENDED.values;
    } else {
      cardSet = customCards
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
        
      if (cardSet.length === 0) {
        setCreateError("Please provide at least one custom card value.");
        return;
      }
    }

    try {
      const args: any = {
        name: roomName.trim(),
        cardSet,
      };
      if (jiraProjectKey.trim()) args.jiraProjectKey = jiraProjectKey.trim();
      if (jiraBaseUrl.trim()) args.jiraBaseUrl = jiraBaseUrl.trim();

      const { roomCode } = await createRoom(args);
      
      const newRoom = { roomCode, name: args.name, visitedAt: Date.now() };
      const updatedRooms = [newRoom, ...recentRooms.filter(r => r.roomCode !== roomCode)].slice(0, 5);
      localStorage.setItem("poker_recent_rooms", JSON.stringify(updatedRooms));
      setRecentRooms(updatedRooms);

      // Navigate to the new room
      navigate(`/room/${roomCode}`);
    } catch (error) {
      setCreateError("Failed to create room. Please try again.");
      console.error("Create room error:", error);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length === 8) {
      navigate(`/room/${joinCode.trim()}`);
    }
  };

  const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Planning Poker
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create a room to estimate tasks with your team or join an existing session.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Create Room Section */}
        <Card className="border-2 border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create Room</CardTitle>
            <CardDescription>Start a new estimation session.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateRoom}>
            <CardContent className="space-y-6">
              {createError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {createError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name <span className="text-destructive">*</span></Label>
                <Input
                  id="room-name"
                  placeholder="e.g. Sprint 42 Planning"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-set">Card Set</Label>
                <Select value={cardSetType} onValueChange={(val: any) => setCardSetType(val)}>
                  <SelectTrigger id="card-set" aria-label="Card Set">
                    <SelectValue placeholder="Select card set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fibonacci">Fibonacci (1, 2, 3, 5, 8...)</SelectItem>
                    <SelectItem value="extended">Fibonacci Extended (0, ½, 1... ?, ☕)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {cardSetType === "custom" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="custom-cards">Custom Card Values</Label>
                  <Input
                    id="custom-cards"
                    placeholder="e.g. S, M, L, XL or 1, 2, 4, 8"
                    value={customCards}
                    onChange={(e) => setCustomCards(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Comma separated values</p>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium leading-none">Jira Integration</h4>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Optional</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jira-project">Project Key</Label>
                    <Input
                      id="jira-project"
                      placeholder="e.g. PROJ"
                      value={jiraProjectKey}
                      onChange={(e) => setJiraProjectKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jira-url">Base URL</Label>
                    <Input
                      id="jira-url"
                      placeholder="e.g. https://your-domain.atlassian.net"
                      value={jiraBaseUrl}
                      onChange={(e) => setJiraBaseUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full font-semibold" size="lg">
                Create Room
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Join Room Section */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Join Room</CardTitle>
              <CardDescription>Enter a room code to join an existing session.</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinRoom}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-code">Room Code</Label>
                  <Input
                    id="room-code"
                    placeholder="8-character code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    maxLength={8}
                    className="font-mono text-center tracking-widest uppercase text-lg"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  variant="secondary" 
                  className="w-full"
                  disabled={joinCode.trim().length !== 8}
                >
                  Join Room
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Recent Rooms */}
          {recentRooms.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentRooms.slice(0, 5).map((room) => (
                    <Button
                      key={room.roomCode}
                      variant="outline"
                      className="w-full justify-between h-auto py-3 font-normal"
                      onClick={() => navigate(`/room/${room.roomCode}`)}
                    >
                      <span className="truncate mr-4 font-medium">{room.name}</span>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                        {room.roomCode}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
