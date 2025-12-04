// app/api/report/route.js
import { pdf } from "@react-pdf/renderer";
import PdfReportServer from "@/pdf/PdfReportServer";
import { getZoomedInPinImage } from "@/utils/pdfUtils";
import { createServerClient } from "@supabase/ssr";

function getSupabase(req) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
      },
    }
  );
}

export async function GET(request) {
  try {
    const supabase = getSupabase(request);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const selectedIds = searchParams.get("selectedIds")?.split(",");

    if (!projectId || !selectedIds?.length) {
      return new Response("Missing parameters", { status: 400 });
    }

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
      .in("id", selectedIds)
      .eq("project_id", projectId);

    if (error || !pins) throw new Error("Failed to fetch pins");

    // ✅ Generate snapshots safely & strip non-serializable fields
    const pinsWithSnapshots = await Promise.all(
      pins.map(async (pin) => {
        const { data: fileData } = await supabase
          .storage
          .from("project-plans")
          .getPublicUrl(pin.plans?.file_url || "");

        let snapshot;
        if (fileData?.publicUrl) {
          snapshot = await getZoomedInPinImage(
            fileData.publicUrl,
            1, // page 1
            pin.x,
            pin.y,
            200,
            200,
            2
         );
        }

        return {
          id: pin.id,
          name: pin.name,
          note: pin.note,
          x: pin.x,
          y: pin.y,
          created_by: pin.created_by,
          status_id: pin.status_id,
          assigned_to: pin.assigned_to
            ? { id: pin.assigned_to.id, name: pin.assigned_to.name }
            : null,
          category_id: pin.category_id,
          due_date: pin.due_date,
          pin_number: pin.pin_number,
          pdf_name: pin.pdf_name,
          projects: pin.projects
            ? {
                id: pin.projects.id,
                name: pin.projects.name,
                project_number: pin.projects.project_number,
              }
            : null,
          snapshot,
          pins_photos: (pin.pins_photos || []).map(p => ({ public_url: p.public_url })),
        };
      })
    );

    // Fetch categories & statuses
    const { data: categories } = await supabase.from("categories").select("*");
    const { data: statuses } = await supabase.from("Status").select("*");
    const { data: project } = await supabase
      .from("projects")
      .select("id,name,project_number")
      .eq("id", projectId)
      .single();

          // NUCLEAR FIX — REMOVE ANY NON-SERIALIZABLE VALUES
    const safeData = {
      selectedPins: JSON.parse(JSON.stringify(pinsWithSnapshots)),
      categories: JSON.parse(JSON.stringify(categories || [])),
      statuses: JSON.parse(JSON.stringify(statuses || [])),
      selectedProject: JSON.parse(JSON.stringify(project || {})),
    };

    

    const pdfDoc = pdf(
      <PdfReportServer
        selectedPins={safeData.selectedPins}
        categories={safeData.categories}
        statuses={safeData.statuses}
        selectedProject={safeData.selectedProject}
      />
    );

    const buffer = await pdfDoc.toBuffer();

   

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report.pdf"`,
      },
    });
  } catch (e) {
    console.error("PDF generation error:", e);
    return new Response("PDF generation failed", { status: 500 });
  }
}
