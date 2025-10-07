import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  membership_status: string;
  avatar_url: string | null;
}

export const AdminMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("xp", { ascending: false });
    
    if (data) setMembers(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Directory</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.level}</TableCell>
                <TableCell>{member.xp}</TableCell>
                <TableCell>
                  <Badge variant={member.role === "officer" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{member.membership_status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
