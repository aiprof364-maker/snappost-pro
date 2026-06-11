import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLeads() {
  const { user } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Queries
  const contactsQuery = trpc.admin.getContacts.useQuery({ status: undefined });
  const subscribersQuery = trpc.admin.getNewsletterSubscribers.useQuery();

  // Mutations
  const updateStatusMutation = trpc.admin.updateContactStatus.useMutation({
    onSuccess: () => {
      contactsQuery.refetch();
    },
  });

  // Check admin access
  if (user?.role !== "admin") {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2 text-gray-600">You need admin access to view this page.</p>
      </div>
    );
  }

  const contacts = contactsQuery.data || [];
  const subscribers = subscribersQuery.data || [];

  const newContacts = contacts.filter(c => c.status === "new");
  const repliedContacts = contacts.filter(c => c.status === "replied");
  const archivedContacts = contacts.filter(c => c.status === "archived");

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Leads & Subscribers</h1>
        <p className="mt-2 text-gray-600">Manage contact form submissions and newsletter subscribers</p>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">
            Contact Form ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            Newsletter ({subscribers.length})
          </TabsTrigger>
        </TabsList>

        {/* Contact Form Submissions */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="text-sm text-gray-600">New</div>
              <div className="text-2xl font-bold">{newContacts.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Replied</div>
              <div className="text-2xl font-bold">{repliedContacts.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Archived</div>
              <div className="text-2xl font-bold">{archivedContacts.length}</div>
            </Card>
          </div>

          {contactsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : contacts.length === 0 ? (
            <Card className="p-8 text-center text-gray-600">
              No contact form submissions yet.
            </Card>
          ) : (
            <div className="space-y-4">
              {contacts.map(contact => (
                <Card
                  key={contact.id}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedContactId(selectedContactId === contact.id ? null : contact.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{contact.name}</div>
                      <div className="text-sm text-gray-600">{contact.email}</div>
                      <div className="mt-2 text-sm text-gray-700 line-clamp-2">{contact.message}</div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge
                        variant={
                          contact.status === "new"
                            ? "default"
                            : contact.status === "replied"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {contact.status}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {selectedContactId === contact.id && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="text-sm">
                        <strong>Full Message:</strong>
                        <p className="mt-2 whitespace-pre-wrap text-gray-700">{contact.message}</p>
                      </div>
                      <div className="flex gap-2">
                        {contact.status !== "replied" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: contact.id, status: "replied" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Mark Replied
                          </Button>
                        )}
                        {contact.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: contact.id, status: "archived" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Newsletter Subscribers */}
        <TabsContent value="subscribers" className="space-y-4">
          {subscribersQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : subscribers.length === 0 ? (
            <Card className="p-8 text-center text-gray-600">
              No newsletter subscribers yet.
            </Card>
          ) : (
            <div className="space-y-2">
              {subscribers.map(sub => (
                <Card key={sub.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{sub.email}</div>
                      <div className="text-xs text-gray-500">
                        Subscribed {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                      {sub.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
