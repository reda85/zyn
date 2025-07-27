'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import { Input } from '@/components/ui/input'; // Adapter selon ta lib de composants
import { IconPicker } from '@/components/IconPicker'; // Composant personnalisé pour choisir une icône
import { supabase } from '@/utils/supabase/client';
import { useAtom } from 'jotai';
import { selectedProjectAtom } from '@/store/atoms';
import { useParams } from 'next/navigation';



export default function ProjectCategories({  }) {
 
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom);
 const { projectId } = useParams();

  // Charger les catégories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true });

      if (data) setCategories(data);
      console.log('categories', data);
      if (error) console.error('Error fetching categories:', error);
      setLoading(false);
    };

    fetchCategories();
  }, [projectId]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reordered = [...categories];
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const updated = reordered.map((cat, index) => ({
      ...cat,
      order: index,
    }));

    setCategories(updated);

    // Mettre à jour Supabase
    await Promise.all(
      updated.map((cat) =>
        supabase
          .from('categories')
          .update({ order: cat.order })
          .eq('id', cat.id)
      )
    );
  };

  const handleNameChange = (index, name) => {
    const updated = [...categories];
    updated[index].name = name;
    setCategories(updated);
  };

  const handleIconChange = (index, icon) => {
    const updated = [...categories];
    updated[index].icon = icon;
    setCategories(updated);
  };

  const handleSaveCategory = async (category) => {
    await supabase.from('categories').update({
      name: category.name,
      icon: category.icon,
    }).eq('id', category.id);
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="space-y-2 w-1/2 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Catégories du projet</h1>

      {categories.length === 0 ? (
        <p>Aucune catégorie trouvée.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}  >
          <Droppable droppableId='categories' isDropDisabled={false} isCombineEnabled ignoreContainerClipping>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {categories.map((cat, index) => (
                  <Draggable key={cat.id} id={String(cat.id)} draggableId={String(cat.id)} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white p-3 rounded shadow flex items-center gap-3"
                      >
                        <IconPicker
                          selected={cat.icon}
                          onChange={(icon) => {
                            handleIconChange(index, icon);
                            handleSaveCategory({ ...cat, icon });
                          }}
                        />
                        <Input
                          value={cat.name}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          onBlur={() => handleSaveCategory(cat)}
                          className="flex-1"
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
   
    </div>
  );
}
