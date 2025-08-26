import { Document, Image, Page, PDFDownloadLink, Text, View } from "@react-pdf/renderer"

import { createTw } from 'react-pdf-tailwind';
import { useAtom } from "jotai";
import { Fragment } from "react";
import { Calendar1Icon, Square3Stack3DIcon } from "./icons";
import { categoriesAtom, selectedProjectAtom, statusesAtom } from "@/store/atoms";
import { pdfIconsMap } from "@/utils/iconsMap";

function PdfCategoryLabel({ category, status }) {
  const iconSrc = pdfIconsMap[category?.icon];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center", // align to middle with text
        justifyContent: "flex-start",
        backgroundColor: status?.color || "#666",
        borderRadius: 9999,
        paddingVertical: 2,
        paddingHorizontal: 4,
        minHeight: 18,
      }}
    >
      {iconSrc && <Image src={iconSrc} style={{ width: 12, height: 12 }} />}
    </View>
  );
}



const tw = createTw({
  theme: {
    fontFamily: {
      sans: ['Helvetica', 'Arial', 'sans-serif'],
    },
    extend: {
      colors: {
        custom: '#bada55',
      },
    },
  },
});


const groupBy = (arr, key) => {
  return arr.reduce((acc, item) => {
    const groupKey = item[key] || 'Autre';
    acc[groupKey] = acc[groupKey] || [];
    acc[groupKey].push(item);
    return acc;
  }, {});
};



export default function PdfReport({ selectedPins, categories, statuses, selectedProject }) {
 

  const pinsByPdfName = groupBy(selectedPins, 'pdf_name');
  const pinsByCategory = groupBy(selectedPins, 'category_id');
  const pinsByStatus = groupBy(selectedPins, 'status_id');
  console.log('pinsByPdfName', pinsByPdfName,);
  console.log('pinsByCategory', pinsByCategory);
  console.log('pinsByStatus', pinsByStatus);
  console.log('selectedPins', selectedPins);
  return (
    <Document>
        <Page style={tw('p-8 h-full w-full')} >
            <View style={[tw('flex flex-row w-full '),{justifyContent:'space-between',width: '100%',
      alignItems: 'top',}]}>
            <View style={[tw('flex flex-col '), { flex: 1 }]}>
            <Text style={tw('text-stone-800 text-base  font-bold ')}>Entreprise X</Text>
            <Text style={tw('text-sm mt-1 text-stone-800')} >{selectedProject?.name}</Text>
            </View>
            <View><Text style={tw('text-sm text-stone-800')}>{new Date().toLocaleDateString('fr-FR')}</Text></View>
            </View>
            <View style={tw('bg-stone-50 w-full p-4 mt-4 rounded-lg')}>
                <Text style={tw('text-stone-800 text-base font-bold capitalize ' )}>Resume du rapport</Text>
                <View style={tw('flex flex-row ')}>
                   <View style={tw('w-1/2 mt-4')}>
                        <Text style={tw('text-stone-800 text-xs font-bold capitalize')}>Date de début - Date de fin</Text>
                        <Text style={tw('text-stone-800 text-sm font-bold mt-4 capitalize')}>{new Date(selectedPins[0]?.due_date).toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <View style={tw('flex flex-row w-1/2 mt-4')}>
                    <View style={tw('w-1/3')}>
                        <Text style={tw('text-stone-800 text-xs font-bold capitalize')}>Total taches</Text>
                        <Text style={tw('text-stone-800 text-sm font-bold mt-4 capitalize')}>{selectedPins?.length}</Text>
                    </View>
                    <View style={tw('w-1/3 px-2')}>
                        <Text style={tw('text-stone-800 text-xs font-bold capitalize')}>Taches en retard</Text>
                        <Text style={tw('text-stone-800 text-sm font-bold mt-4 capitalize')}>{selectedPins?.length}</Text>
                    </View>
                    <View style={tw('w-1/3 px-2')}>
                        <Text style={tw('text-stone-800 text-xs font-bold capitalize')}>Total plans</Text>
                        <Text style={tw('text-stone-800 text-sm font-bold mt-4 capitalize')}>{selectedPins?.length}</Text>
                    </View>
                    </View>
                   
                </View>

                <View
        style={{
          height: 1,
          backgroundColor: '#ccc',
          marginVertical: 8,
          width: '100%',
        }}
      />
      <View style={tw('flex flex-col mt-4 ')}>
         <Text style={tw('text-stone-800 text-sm font-bold capitalize')}>Taches par statut</Text>
     
      <View style={tw('flex flex-row mt-4 ')}>
       
      {Object.keys(pinsByStatus).map((status_id, index) => {
  const status = statuses.find(s => String(s.id) === String(status_id));
  //console.log("Category icon:", categories.find(c => String(c.id) === String(pin.category_id))?.icon, "=>", iconsMap[categories.find(c => String(c.id) === String(pin.category_id))?.icon]);

  return (
    <View
      key={index}
      style={[
        tw("rounded-full px-2 py-1 mr-2 flex-row items-center"),
        { backgroundColor: status?.color || "#666" }
      ]}
    >
      <Text style={tw("text-white text-sm")}>{status?.name || "Inconnu"}</Text>
      <Text style={tw("text-white text-sm ml-1")}>({pinsByStatus[status_id]?.length})</Text>
    </View>
  );
})}

      </View>
</View>
            </View >
{selectedPins.map((pin, index) => (
  
  <View key={index}>
    <View
      wrap={false}
      style={[
        tw('flex flex-row my-4'),
        { breakInside: 'avoid' }
      ]}
    >
      <View style={tw('w-1/2 mt-4')}>
        <Text style={tw('text-stone-800 text-lg font-bold')}>
          {index + 1}. {pin.name}
        </Text>
<View style={tw('flex flex-row items-center gap-2 my-1 mt-2')}>
  <PdfCategoryLabel
    category={categories.find(c => String(c.id) === String(pin.category_id))}
    status={statuses.find(s => s.id === pin?.status_id)}
  />
  <View
    style={[
      tw("rounded-full px-2 py-1 flex-row items-center"),
      { backgroundColor: statuses.find(s => s.id === pin?.status_id)?.color || "#666" }
    ]}
  >
    <Text style={tw("text-white text-sm")}>
      {statuses.find(s => s.id === pin?.status_id)?.name || "Inconnu"}
    </Text>
  </View>
</View>

        <View style={tw('flex flex-row my-1 ')}>
            <Text style={tw('text-stone-700 text-sm font-bold w-36')}>ID:</Text>
          <Text style={tw('text-stone-800 text-sm')}>{pin?.projects?.project_number}-{pin?.pin_number}</Text>
          </View>
        {pin?.category_id && (
          <View style={tw('flex flex-row my-1')}>
            <Text style={tw('text-stone-700 text-sm font-bold w-36')}>Catégorie:</Text>
         
{/* <PdfCategoryLabel category={categories.find(c => String(c.id) === String(pin.category_id))} /> */}
<Text style={tw("text-sm text-stone-800")}>
 
  { categories.find(c => String(c.id) === String(pin.category_id))?.name }
</Text>
          </View>
        )}

        <View style={tw('flex flex-row my-1 ')}>
            <Text style={tw('text-stone-700 text-sm font-bold w-36')}>Créé par:</Text>
          <Text style={tw('text-stone-800 text-sm')}>{pin?.created_by || '-'}</Text>
          </View>

<View style={tw('flex flex-row my-1 ')}>
            <Text style={tw('text-stone-700 text-sm font-bold w-36')}>Assignee a:</Text>
          <Text style={tw('text-stone-800 text-sm')}>{pin?.assigned_to?.name || '-'}</Text>
          </View>

          <View style={tw('flex flex-row my-1 ')}>
            <Text style={tw('text-stone-700 text-sm font-bold w-36')}>Echeance:</Text>
            <View style={tw('flex flex-row mr-2 gap-2 ')}>
              <Image src={'/icons/calendar-days-stone.png'} style={{ width: 12, height: 12 }} />
          <Text style={tw('text-stone-800 text-sm')}>{pin?.due_date ? new Date(pin.due_date).toLocaleDateString('fr-FR') : '-'}</Text>
          </View>
          </View>
        
          <View style={tw('flex flex-row my-1 ')}>
            <Text style={tw('text-stone-700 text-sm font-bold w-36')}>Description:</Text>
          <Text style={tw('text-stone-800 text-sm')}>{pin?.note || '-'}</Text>
          </View>
       
      </View>
      <View style={tw('flex flex-col mt-4')}>
        {pin.snapshot && (
          <Image
            src={pin.snapshot}
            style={{
              width: 200,
              height: 200,
              objectFit: 'cover',
              border: '3pt solid black',
            }}
          />
        )}
        {pin.pdf_name && (
          <View style={tw('flex flex-row mt-1 gap-2  ')}>
            <Image src={'/icons/map-stone.png'} style={{ width: 12, height: 12 }} />
          <Text style={tw('text-stone-800 text-sm font-bold capitalize')}>{pin.pdf_name}</Text>
          </View>
        )}
      </View>
        </View>
     <View style={tw('flex flex-col mt-4')}>
      {pin.pins_photos?.length > 0 && ( <Text style={tw('text-stone-700 text-sm font-bold w-36')}>Medias</Text>)}
       <View style={tw('flex flex-row my-2 gap-2')}>
      {pin.pins_photos?.map((photo, index) => (
        <Image key={index} src={photo.public_url} style={{
          width: 150,
          height: 150,
          objectFit: 'cover',
          //border: '3pt solid black',
        }} />
      ))}
    
      </View>
    </View>

    {/* Divider between pins, except after the last one */}
    {index !== selectedPins.length - 1 && (
      <View
        style={{
          height: 1,
          backgroundColor: '#ccc',
          marginVertical: 8,
          width: '100%',
        }}
      />
    )}
  </View>
))}

        </Page>
    </Document>
    );
    }