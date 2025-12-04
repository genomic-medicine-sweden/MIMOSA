import { useEffect, useState } from "react";

export default function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (newUser) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newUser),
    });
    if (!res.ok) throw new Error(await res.text());
    const created = await res.json();
    setUsers((prev) => [...prev, created]);
    return created;
  };

  const updateUser = async (originalEmail, updatedFields, index) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${encodeURIComponent(originalEmail)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updatedFields),
      },
    );
    if (!res.ok) throw new Error(await res.text());
    const updated = await res.json();
    setUsers((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
    return updated;
  };

  const deleteUser = async (email) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error(await res.text());
    setUsers((prev) => prev.filter((u) => u.email !== email));
  };

  const updatePassword = async (email, newPassword) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${encodeURIComponent(email)}/password`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      },
    );
    if (!res.ok) throw new Error(await res.text());
  };

  return {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser,
    updatePassword,
  };
}
