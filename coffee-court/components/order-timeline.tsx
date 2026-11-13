import { Check, Clock, X } from "lucide-react";
import { clock, type Order } from "../lib/domain";
export default function OrderTimeline({
  order,
  compact = false,
}: {
  order: Order;
  compact?: boolean;
}) {
  const stages = [
    { status: "Received", label: "Order received" },
    { status: "Preparing", label: "Preparing" },
    { status: "Ready", label: "Ready for pickup" },
    { status: "Completed", label: "Collected" },
  ];
  const current = stages.findIndex((s) => s.status === order.status);
  const history = order.timeline?.length
    ? order.timeline
    : [{ status: "Received", at: order.createdAt }];
  return (
    <div className={`order-timeline ${compact ? "compact" : ""}`}>
      <ol aria-label="Order timeline">
        {stages.map((stage, index) => {
          const event = history.find((e) => e.status === stage.status);
          const done = current >= index || Boolean(event);
          return (
            <li
              key={stage.status}
              className={done ? "done" : ""}
              aria-current={current === index ? "step" : undefined}
            >
              <span className="order-timeline-dot">
                {done ? <Check size={12} /> : <Clock size={12} />}
              </span>
              <div>
                <b>{stage.label}</b>
                <small>
                  {event
                    ? `${clock(event.at)} IST`
                    : current > index
                      ? "Completed"
                      : current === index
                        ? "In progress"
                        : "Waiting"}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
      {order.status === "Cancelled" && (
        <p className="order-cancelled-note">
          <X size={14} />
          Cancelled by the admin team
          {history.find((e) => e.status === "Cancelled")
            ? ` · ${clock(history.find((e) => e.status === "Cancelled")!.at)} IST`
            : ""}
        </p>
      )}
    </div>
  );
}
