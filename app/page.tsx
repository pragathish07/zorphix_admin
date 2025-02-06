"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import * as XLSX from "xlsx";

const availableEvents = [
  "Xcoders", "Coin Quest", "Algo Rythms", "Caseathon", 
  "Reverse Coding", "Virtuoso", "Thesis Precized", "Flip It Quiz It"
];

interface UserType {
  uid: string;
  name?: string;
  email?: string;
  contactNo?: string;
  collegeName?: string;
  department?: string;
  registeredEvents?: { name: string }[];
}

export default function Home() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("registeredEvents");
  const [selectedEvent, setSelectedEvent] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const usersCollection = collection(db, "users");
          const q = query(usersCollection, where("uid", "==", currentUser.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setIsAdmin(userData.isAdmin || false);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        try {
          const usersCollection = collection(db, "users");
          const q = query(usersCollection);
          const querySnapshot = await getDocs(q);

          const data: UserType[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as UserType),
          }));
          setUsers(data);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isAdmin]);

  if (isAdmin === null) return <p className="loading_screen">Checking admin permissions...</p>;

  if (!isAdmin) {
    router.push("/");
    return null;
  }

  const filteredUsers = users.filter((user) => {
    if (!selectedEvent) return true;
    const normalizedSelectedEvent = selectedEvent?.trim().toLowerCase().replace(/[^a-z0-9]/gi, "");
    return user.registeredEvents?.some((event) => {
      const normalizedEventName = event?.name?.trim().toLowerCase().replace(/[^a-z0-9]/gi, "");
      return normalizedEventName === normalizedSelectedEvent;
    });
  }).sort((a, b) => {
    if (sortField === "registeredEvents") {
      return (b.registeredEvents?.length || 0) - (a.registeredEvents?.length || 0);
    } else if (sortField === "name") {
      return (a.name || "").localeCompare(b.name || "");
    } else if (sortField === "collegeName") {
      return (a.collegeName || "").localeCompare(b.collegeName || "");
    }
    return 0;
  });

  const handleDownloadExcel = () => {
    const exportData = filteredUsers.map((user) => ({
      Name: user.name || "N/A",
      Email: user.email || "N/A",
      "Contact No": user.contactNo || "N/A",
      College: user.collegeName || "N/A",
      Department: user.department || "N/A",
      "Registered Events": user.registeredEvents?.map((event) => event.name).join(", ") || "None",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users_data.xlsx");
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white shadow-md rounded-lg text-black">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Admin Panel
      </h1>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-x-4 w-full">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select 
              onChange={(e) => setSortField(e.target.value)}
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="registeredEvents">Total Events Registered</option>
              <option value="name">Name</option>
              <option value="collegeName">College</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Filter by Event:
            </label>
            <select 
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">All Events</option>
              {availableEvents.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleDownloadExcel}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-300 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-9.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Contact No', 'College', 'Department', 'Registered Events', 'No.of.events'].map((header, index) => (
                  <th 
                    key={`header-${index}`}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody key="table-body" className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.uid} 
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <td className="px-6 py-2 whitespace-nowrap">{user.name || "N/A"}</td>
                  <td className="px-6 py-2 whitespace-nowrap">{user.email || "N/A"}</td>
                  <td className="px-6 py-2 whitespace-nowrap">{user.contactNo || "N/A"}</td>
                  <td className="px-6 py-2 whitespace-nowrap">{user.collegeName || "N/A"}</td>
                  <td className="px-6 py-2 whitespace-nowrap">{user.department || "N/A"}</td>
                  <td className="px-6 py-2">
                    {user.registeredEvents?.length ? (
                      <div className="space-y-1 flex justify-center items-center">
                        {user.registeredEvents?.map((event, index) => (
                          <span 
                            key={`${user.uid}-event-${index}`}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-2 rounded mr-1 mb-1 text-center"
                          >
                            {event.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-center mr-1 mb-1">None</span>
                    )}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">{user.registeredEvents?.length || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-10 bg-gray-50">
              <p className="text-gray-500">No users found matching the current filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}