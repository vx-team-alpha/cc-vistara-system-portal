REVOKE ALL ON TABLE "public"."orders" FROM "authenticated";

REVOKE ALL ("cancelled_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("cancelled_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("completed_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("completed_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("confirmed_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("confirmed_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("customer_snapshot") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("customer_snapshot") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("delivery_date") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("delivery_date") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("issued_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("issued_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("note") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("note") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("production_at") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("production_at") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("revision") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("revision") ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ("status") ON TABLE "public"."orders" FROM "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."orders" TO "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."orders" TO "authenticated";
