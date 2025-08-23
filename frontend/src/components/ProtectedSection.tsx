import { useUser } from "../UserContext";

interface ProtectedSectionProps {
  children: React.ReactNode;
}

export default function ProtectedSection({ children }: ProtectedSectionProps) {
  const { userId } = useUser(); // add a loading state if needed

  // while userId is loading, you can show nothing or a spinner
  // if (loading) return null;

  if (!userId) return <p>Please log in to rate shows.</p>;

  return <>{children}</>;
}
