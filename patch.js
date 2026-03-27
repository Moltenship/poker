--- src/pages/Home.tsx
+++ src/pages/Home.tsx
@@ -58,6 +58,13 @@
       const { roomCode } = await createRoom(args);
       
+      // Save to recent rooms
+      const newRoom = { roomCode, name: args.name, visitedAt: Date.now() };
+      const updatedRooms = [newRoom, ...recentRooms.filter(r => r.roomCode !== roomCode)].slice(0, 5);
+      localStorage.setItem("poker_recent_rooms", JSON.stringify(updatedRooms));
+      setRecentRooms(updatedRooms);
+
       // Navigate to the new room
       navigate(`/room/${roomCode}`);
     } catch (error) {
