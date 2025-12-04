// utils/generatePdf.js
import { renderToStream } from "@react-pdf/renderer";
import PdfReport from "@/components/PdfReport";
import { supabase } from "@/utils/supabase/client";
import { getZoomedInPinImage } from "./pdfUtils";

export async function fetchAndGeneratePdf(projectId, selectedIds) {
  // 1. Fetch pins
  const { data: pins, error } = await supabase
    .from("pdf_pins")
    .select(`
      id,name,note,x,y,created_by,status_id,
      assigned_to(id,name),
      category_id,
      categories(name),
      due_date,
      pin_number,
      pdf_name,
      projects(id,name,project_number),
      project_id,
      pins_photos(id,public_url),
      plans(id,name,file_url)
    `)
    .in("id", Array.from(selectedIds))
    .eq("project_id", projectId);

  if (error || !pins) throw new Error("Failed to fetch pins");

  // 2. Generate snapshots
  const pinsWithSnapshots = await Promise.all(
    pins.map(async (pin) => {
      const fileUrl =
        supabase.storage.from("project-plans").getPublicUrl(pin.plans.file_url)
          .data.publicUrl;

      const snapshot = await getZoomedInPinImage(
        fileUrl,
        1,           // Always page 1
        pin.x,
        pin.y,
        200,
        200,
        2            // zoom multiplier
      );

      return { ...pin, snapshot };
    })
  );

  // 3. Fetch categories & statuses
  const { data: categories } = await supabase.from("categories").select("*");
  const { data: statuses } = await supabase.from("statuses").select("*");
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  // 4. Render PDF
  const reportDoc = (
    <PdfReport
      selectedPins={pinsWithSnapshots}
      categories={categories}
      statuses={statuses}
      selectedProject={project}
    />
  );

  const stream = await renderToStream(reportDoc);
  return stream;
}
