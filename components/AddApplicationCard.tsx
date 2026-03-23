"use client";

type AddApplicationCardProps = {
  onCreated?: () => void;
};

const AddApplicationCard = ({ onCreated }: AddApplicationCardProps) => {
  void onCreated;

  return (
    <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
      <div className="flex flex-col gap-2 px-6 py-5">
        <h2 className="text-lg font-semibold text-amber-950">Create Application</h2>
        <p className="text-sm text-amber-900">
          This frontend was adapted to the current backend contract. The backend does not expose
          `POST /api/applications` yet, so create-from-UI is intentionally disabled to avoid wiring
          the screen to a nonexistent route.
        </p>
      </div>
    </section>
  );
};

export default AddApplicationCard;
