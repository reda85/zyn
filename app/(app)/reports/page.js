'use client';
import React, { useState, useEffect } from 'react';
import { Type, Image, AlignLeft, Square, Circle, Minus, Palette, Users, ListChecks, Rows, Columns, List } from 'lucide-react'; 
import { useAtom } from 'jotai'; 
import { themeAtom } from '@/store/themeAtom';

export default function PdfTemplateEditor() {
  const [projectConfig, setProjectConfig] = useState({
    showProjectName: false,
    showEnterpriseName: false,
    showAttendees: false,
    showPins: false,
  });
  
  // 🛑 NEW STATE: Layout Configuration
  const [componentLayouts, setComponentLayouts] = useState({
      projectHeader: 'verticalStack', // 'verticalStack' | 'horizontalLine'
      pins: 'gridTable',             // 'gridTable' | 'verticalList'
      // attendees could also have a layout, but we keep it simple for now
  });

  const [selectedElement, setSelectedElement] = useState(null);
  const [pageElements, setPageElements] = useState([]);
  const [activeTab, setActiveTab] = useState('config'); 

  const [theme, setTheme] = useAtom(themeAtom); 

  // ... (Theme Accessors and constants remain the same)
  const pagePadding = theme.pagePadding || 0;
  const pageMarginLeft = theme.pageMarginLeft || 0;
  const pageMarginRight = theme.pageMarginRight || 0;
  const pageMarginTop = pagePadding;
  const pageMarginBottom = pagePadding;

  const contentWidth = 794 - pageMarginLeft - pageMarginRight;
  const pdfWidth = 794; 
  const pdfHeight = 1123; 
  const scale = 0.7; 

  const projectHeaderColor = theme.projectHeaderColor || theme.defaultTextColor || '#1f2937';
  const attendeesBgColor = theme.attendeesBgColor || 'transparent';
  const pinsTableColor = theme.pinsTableColor || theme.defaultTextColor || '#4b5563';
  const sectionGap = theme.sectionGap || 30;

  // 🛑 REFACTOR: Updated function to generate the core dynamic elements
  const generateDynamicElements = (config, layouts) => {
    const dynamicElements = [];
    
    const initialX = 10;
    let yOffset = 10; 
    let isFirstSection = true; 

    const advanceYOffset = () => {
        if (!isFirstSection) {
            yOffset += sectionGap;
        }
        isFirstSection = false;
    };

    // --- 1. Project Component ---
    if (config.showProjectName || config.showEnterpriseName) {
        advanceYOffset();
        
        const projectNameContent = 'Project Name: Q4 Initiative Review';
        const enterpriseNameContent = 'Enterprise Name: TechCorp Solutions Ltd.';
        
        if (layouts.projectHeader === 'verticalStack') {
            
            if (config.showProjectName) {
                dynamicElements.push({
                    id: 'project-name', type: 'text', content: projectNameContent, x: initialX, y: yOffset,
                    fontSize: 24, fontWeight: 'bold', color: projectHeaderColor 
                });
                yOffset += 40;
            }

            if (config.showEnterpriseName) {
                dynamicElements.push({
                    id: 'enterprise-name', type: 'text', content: enterpriseNameContent, x: initialX, y: yOffset,
                    fontSize: 18, fontWeight: 'normal', color: projectHeaderColor 
                });
                yOffset += 40;
            }
            
        } else if (layouts.projectHeader === 'horizontalLine') {
            
            const gap = 20; // Horizontal gap between elements
            let currentX = initialX;
            let maxY = yOffset + 30; // Max Y advance for horizontal layout

            if (config.showProjectName) {
                dynamicElements.push({
                    id: 'project-name', type: 'text', content: projectNameContent, x: currentX, y: yOffset + 5,
                    fontSize: 14, fontWeight: 'bold', color: projectHeaderColor 
                });
                currentX += 200 + gap; // Assume 200px width
            }

            if (config.showEnterpriseName) {
                dynamicElements.push({
                    id: 'enterprise-name', type: 'text', content: enterpriseNameContent, x: currentX, y: yOffset + 5,
                    fontSize: 14, fontWeight: 'normal', color: projectHeaderColor 
                });
            }
            yOffset = maxY; // Advance Y after the horizontal row
        }
        
        // Separator Line
        dynamicElements.push({
            id: 'project-separator',
            type: 'line', content: '', x: initialX, y: yOffset,
            width: contentWidth - (initialX * 2), height: 1, color: '#dddddd',
        });
        yOffset += 20;
    }
    
    // --- 2. Attendees Component (Layout remains fixed for now) ---
    if (config.showAttendees) {
        advanceYOffset();
        
        // Add a visual background container 
        dynamicElements.push({
            id: 'attendees-bg', type: 'box', content: '', x: 0, y: yOffset,
            width: contentWidth, height: 60, color: attendeesBgColor, 
        });
        
        dynamicElements.push({
            id: 'attendees-header', type: 'text', content: 'Attendees', x: initialX, y: yOffset + 5,
            fontSize: 16, fontWeight: 'semibold', color: theme.defaultTextColor,
        });
        
        dynamicElements.push({
            id: 'attendees-list', type: 'text', content: 'John Doe, Jane Smith, Alice Johnson (3 total)', x: initialX, y: yOffset + 30,
            fontSize: 12, fontWeight: 'normal', color: theme.defaultTextColor,
        });
        yOffset += 60;
    }
    
    // --- 3. Pins Component (Tasks/Action Items) ---
    if (config.showPins) {
        advanceYOffset();
        
        dynamicElements.push({
            id: 'pins-header-main', type: 'text', content: 'Action Items (Pins)', x: initialX, y: yOffset,
            fontSize: 16, fontWeight: 'semibold', color: theme.defaultTextColor,
        });
        yOffset += 25;
        
        // Example Pins Data (Hardcoded for preview)
        const examplePins = [
            { task: 'Finalize API Spec', category: 'Backend', status: 'Done', due: '2025-12-15', assigned: 'JD' },
            { task: 'Design Review Mockup', category: 'Design', status: 'In Progress', due: '2025-12-20', assigned: 'AS' },
            { task: 'Update Readme', category: 'Documentation', status: 'Pending', due: '2025-12-25', assigned: 'JD' },
        ];
        
        if (layouts.pins === 'gridTable') {
            // Grid/Table Layout (Default)
            const pinHeaders = [
                { id: 'pin-h-task', content: 'Task Name', x: initialX + 0 },
                { id: 'pin-h-category', content: 'Category', x: initialX + 160 },
                { id: 'pin-h-status', content: 'Status', x: initialX + 250 },
                { id: 'pin-h-due', content: 'Due Date', x: initialX + 340 },
                { id: 'pin-h-assigned', content: 'Assigned To', x: initialX + 440 },
            ];
            
            // Render Headers
            pinHeaders.forEach(header => {
                dynamicElements.push({
                    id: header.id, type: 'text', content: header.content, x: header.x, y: yOffset,
                    fontSize: 10, fontWeight: 'bold', color: pinsTableColor,
                });
            });
            yOffset += 20;
            
            // Render Rows
            examplePins.forEach((pin, index) => {
                const rowY = yOffset + (index * 15);
                dynamicElements.push({ id: `pin-${index}-task`, type: 'text', content: pin.task, x: pinHeaders[0].x, y: rowY, fontSize: 10, fontWeight: 'normal', color: theme.defaultTextColor, });
                dynamicElements.push({ id: `pin-${index}-category`, type: 'text', content: pin.category, x: pinHeaders[1].x, y: rowY, fontSize: 10, fontWeight: 'normal', color: theme.defaultTextColor, });
                dynamicElements.push({ id: `pin-${index}-status`, type: 'text', content: pin.status, x: pinHeaders[2].x, y: rowY, fontSize: 10, fontWeight: 'normal', color: theme.defaultTextColor, });
                dynamicElements.push({ id: `pin-${index}-due`, type: 'text', content: pin.due, x: pinHeaders[3].x, y: rowY, fontSize: 10, fontWeight: 'normal', color: theme.defaultTextColor, });
                dynamicElements.push({ id: `pin-${index}-assigned`, type: 'text', content: pin.assigned, x: pinHeaders[4].x, y: rowY, fontSize: 10, fontWeight: 'normal', color: theme.defaultTextColor, });
            });
            yOffset += (examplePins.length * 15) + 20;

        } else if (layouts.pins === 'verticalList') {
            // Vertical List Layout
            examplePins.forEach((pin, index) => {
                const pinBlockY = yOffset + (index * 40); // 40px spacing per item
                
                // Task Name (Title)
                dynamicElements.push({ 
                    id: `pin-${index}-task-list`, type: 'text', content: pin.task, 
                    x: initialX, y: pinBlockY, fontSize: 12, fontWeight: 'bold', color: pinsTableColor,
                });
                
                // Details (Status | Due | Assigned)
                dynamicElements.push({ 
                    id: `pin-${index}-details-list`, type: 'text', 
                    content: `Category: ${pin.category} | Status: ${pin.status} | Due: ${pin.due} | Assigned: ${pin.assigned}`, 
                    x: initialX + 5, y: pinBlockY + 15, fontSize: 10, fontWeight: 'normal', color: theme.defaultTextColor,
                });
                
                yOffset = pinBlockY + 40; // Update Y offset for next item
            });
            yOffset += 15; // Final adjustment
        }
    }

    return dynamicElements;
  };

  // --- Handlers & Effects ---
  
  // Handler for layout changes
  const handleLayoutChange = (component, layout) => {
      setComponentLayouts(prevLayouts => ({
          ...prevLayouts,
          [component]: layout
      }));
  };

  // EFFECT HOOK: Update pageElements whenever projectConfig, componentLayouts, OR theme changes.
  useEffect(() => {
    const newDynamicElements = generateDynamicElements(projectConfig, componentLayouts); 
    
    // ... (logic to merge elements and preserve user edits remains the same)
    const existingElementMap = pageElements.reduce((acc, el) => {
        acc[el.id] = el;
        return acc;
    }, {});
    
    const mergedElements = newDynamicElements.map(newEl => {
      const existingEl = existingElementMap[newEl.id];
      
      if (existingEl && newEl.type !== 'line' && newEl.type !== 'box') {
          // Preserve manual edits (content, size, position)
          return {
              ...newEl,
              content: existingEl.content,
              fontSize: existingEl.fontSize,
              x: existingEl.x,
              y: existingEl.y,
          };
      }
      return newEl;
    });

    setPageElements(mergedElements);

    if (selectedElement && !mergedElements.some(el => el.id === selectedElement.id)) {
        setSelectedElement(null);
    }
  }, [projectConfig, componentLayouts, theme]); // 🛑 Dependency added: componentLayouts


  // (handleElementPropertyChange and handleThemePropertyChange remain the same)
  const handleElementPropertyChange = (key, value) => {
    if (!selectedElement) return;

    const newSelectedElement = { ...selectedElement, [key]: value };
    setSelectedElement(newSelectedElement);

    setPageElements(prevElements => 
        prevElements.map(el => 
            el.id === selectedElement.id ? newSelectedElement : el
        )
    );
  };
  
  const handleThemePropertyChange = (key, value) => {
    const processedValue = (key.includes('padding') || key.includes('margin') || key.includes('Gap') || key.includes('Size'))
        ? parseInt(value) || 0 
        : value;
        
    setTheme(prevTheme => ({
        ...prevTheme,
        [key]: processedValue
    }));
  };

  const handleProjectConfigChange = (key, checked) => {
    setProjectConfig(prevConfig => ({ ...prevConfig, [key]: checked }));
  };
  // ----------------------------------------------------------------------------------

  // 🛑 REFACTOR: renderConfigTab now includes Layout Selectors
  const renderConfigTab = () => (
    <div className="space-y-6">
      
      {/* 1. Project Component Configuration */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className={`w-full px-4 py-3 text-left font-medium text-sm flex items-center justify-between bg-gray-50 text-gray-700`}>
          <AlignLeft className="h-4 w-4 mr-2" />
          <span>Project Header</span>
        </div>
        <div className="p-4 space-y-4 bg-white">
            {/* Show/Hide Toggles */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={projectConfig.showProjectName}
                    onChange={(e) => handleProjectConfigChange('showProjectName', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Project Name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={projectConfig.showEnterpriseName}
                    onChange={(e) => handleProjectConfigChange('showEnterpriseName', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Enterprise Name</span>
            </label>

            <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Disposition</h4>
                <div className='flex gap-2'>
                    <button
                        onClick={() => handleLayoutChange('projectHeader', 'verticalStack')}
                        className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-md transition-colors text-sm ${
                            componentLayouts.projectHeader === 'verticalStack' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title="Vertical Stack"
                    >
                        <Rows className="h-4 w-4" /> Vertical
                    </button>
                    <button
                        onClick={() => handleLayoutChange('projectHeader', 'horizontalLine')}
                        className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-md transition-colors text-sm ${
                            componentLayouts.projectHeader === 'horizontalLine' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title="Horizontal Line"
                    >
                        <Columns className="h-4 w-4" /> Horizontal
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      {/* 2. Attendees Component Configuration (Remains simple) */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className={`w-full px-4 py-3 text-left font-medium text-sm flex items-center justify-between bg-gray-50 text-gray-700`}>
          <Users className="h-4 w-4 mr-2" />
          <span>Attendees List</span>
        </div>
        <div className="p-4 space-y-3 bg-white">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={projectConfig.showAttendees}
              onChange={(e) =>
                handleProjectConfigChange('showAttendees', e.target.checked)
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show Attendees Section</span>
          </label>
        </div>
      </div>

      {/* 3. Pins Component Configuration */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className={`w-full px-4 py-3 text-left font-medium text-sm flex items-center justify-between bg-gray-50 text-gray-700`}>
          <ListChecks className="h-4 w-4 mr-2" />
          <span>Action Items (Pins)</span>
        </div>
        <div className="p-4 space-y-4 bg-white">
            {/* Show/Hide Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={projectConfig.showPins}
                    onChange={(e) => handleProjectConfigChange('showPins', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Pins Table/List</span>
            </label>
            
            <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Disposition</h4>
                <div className='flex gap-2'>
                    <button
                        onClick={() => handleLayoutChange('pins', 'gridTable')}
                        className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-md transition-colors text-sm ${
                            componentLayouts.pins === 'gridTable' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title="Grid / Table View"
                    >
                        <Rows className="h-4 w-4" /> Grid / Table
                    </button>
                    <button
                        onClick={() => handleLayoutChange('pins', 'verticalList')}
                        className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-md transition-colors text-sm ${
                            componentLayouts.pins === 'verticalList' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title="Vertical List View"
                    >
                        <List className="h-4 w-4" /> Vertical List
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      {/* Add Elements Section (remains the same) */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Add Custom Elements</h3>
        <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm">
              <Type className="h-4 w-4" /> Text
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm">
              <Image className="h-4 w-4" /> Image
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm">
              <Square className="h-4 w-4" /> Box
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm">
              <Minus className="h-4 w-4" /> Line
            </button>
        </div>
      </div>
    </div>
  );

  // (renderDesignTab, renderPropertiesTab, renderTabContent remain the same from the previous step)
  const renderDesignTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Global & Layout Design</h3>
      
      {/* Global Page Layout */}
      <div className="border border-gray-200 rounded-lg overflow-hidden p-4 space-y-3">
        <h4 className="font-semibold text-gray-700">Page Margins & Color</h4>
        
        {/* Page Padding (Top/Bottom Margin) */}
        <div className="space-y-1">
          <label htmlFor="pagePadding" className="block text-sm font-medium text-gray-700">Top/Bottom Margin (px)</label>
          <input
            id="pagePadding"
            type="number"
            value={theme.pagePadding}
            onChange={(e) => handleThemePropertyChange('pagePadding', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
          />
        </div>

        {/* Margin Left / Right (simplified for space) */}
        <div className='flex gap-4'>
            <div className="space-y-1 flex-1">
                <label htmlFor="pageMarginLeft" className="block text-sm font-medium text-gray-700">Margin Left (px)</label>
                <input id="pageMarginLeft" type="number" value={theme.pageMarginLeft}
                    onChange={(e) => handleThemePropertyChange('pageMarginLeft', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                />
            </div>
             <div className="space-y-1 flex-1">
                <label htmlFor="pageMarginRight" className="block text-sm font-medium text-gray-700">Margin Right (px)</label>
                <input id="pageMarginRight" type="number" value={theme.pageMarginRight}
                    onChange={(e) => handleThemePropertyChange('pageMarginRight', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                />
            </div>
        </div>

        {/* Section Gap */}
        <div className="space-y-1">
            <label htmlFor="sectionGap" className="block text-sm font-medium text-gray-700">Vertical Section Gap (px)</label>
            <input
                id="sectionGap"
                type="number"
                value={theme.sectionGap}
                onChange={(e) => handleThemePropertyChange('sectionGap', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
            />
        </div>
        
        {/* Colors */}
        <div className="space-y-1">
            <label htmlFor="defaultTextColor" className="block text-sm font-medium text-gray-700">Default Text Color</label>
            <input id="defaultTextColor" type="color" value={theme.defaultTextColor}
                onChange={(e) => handleThemePropertyChange('defaultTextColor', e.target.value)}
                className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 text-sm cursor-pointer"
            />
        </div>
        <div className="space-y-1">
            <label htmlFor="pageBackgroundColor" className="block text-sm font-medium text-gray-700">Page Background Color</label>
            <input id="pageBackgroundColor" type="color" value={theme.pageBackgroundColor}
                onChange={(e) => handleThemePropertyChange('pageBackgroundColor', e.target.value)}
                className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 text-sm cursor-pointer"
            />
        </div>
      </div>

      <hr className="my-6" />

      <h3 className="text-xl font-semibold text-gray-800">Section Specific Designs</h3>

      {/* 1. Project Header Design */}
      <div className="border border-gray-200 rounded-lg overflow-hidden p-4 space-y-3">
        <h4 className="font-semibold text-gray-700 flex items-center"><AlignLeft className="h-4 w-4 mr-2" /> Project Header</h4>
        <div className="space-y-1">
            <label htmlFor="projectHeaderColor" className="block text-sm font-medium text-gray-700">Header Text Color</label>
            <input
                id="projectHeaderColor"
                type="color"
                value={projectHeaderColor}
                onChange={(e) => handleThemePropertyChange('projectHeaderColor', e.target.value)}
                className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 text-sm cursor-pointer"
            />
        </div>
      </div>
      
      {/* 2. Attendees List Design */}
      <div className="border border-gray-200 rounded-lg overflow-hidden p-4 space-y-3">
        <h4 className="font-semibold text-gray-700 flex items-center"><Users className="h-4 w-4 mr-2" /> Attendees List</h4>
        <div className="space-y-1">
            <label htmlFor="attendeesBgColor" className="block text-sm font-medium text-gray-700">Section Background Color</label>
            <input
                id="attendeesBgColor"
                type="color"
                value={attendeesBgColor}
                onChange={(e) => handleThemePropertyChange('attendeesBgColor', e.target.value)}
                className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 text-sm cursor-pointer"
            />
        </div>
        <p className="text-xs text-gray-500">Note: This color applies to a fixed background box.</p>
      </div>

      {/* 3. Pins Table Design */}
      <div className="border border-gray-200 rounded-lg overflow-hidden p-4 space-y-3">
        <h4 className="font-semibold text-gray-700 flex items-center"><ListChecks className="h-4 w-4 mr-2" /> Pins Table</h4>
        <div className="space-y-1">
            <label htmlFor="pinsTableColor" className="block text-sm font-medium text-gray-700">Table Header Text Color</label>
            <input
                id="pinsTableColor"
                type="color"
                value={pinsTableColor}
                onChange={(e) => handleThemePropertyChange('pinsTableColor', e.target.value)}
                className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 text-sm cursor-pointer"
            />
        </div>
      </div>
    </div>
  );

  const renderPropertiesTab = () => (
    <div className="pt-4 border-t border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Properties</h3>
      {selectedElement ? (
        <div className="space-y-3">
            <p className="text-xs text-gray-500">Editing: **{selectedElement.id}**</p>
            
            {/* Content/Text Input */}
            {(selectedElement.type === 'text' || selectedElement.type === 'box') && (
                <div className="space-y-1">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                    <input
                        id="content"
                        type="text"
                        value={selectedElement.content}
                        onChange={(e) => handleElementPropertyChange('content', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            )}
            
            {/* Font Size Input */}
            {selectedElement.type === 'text' && (
                <div className="space-y-1">
                    <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700">Font Size (px)</label>
                    <input
                        id="fontSize"
                        type="number"
                        value={selectedElement.fontSize}
                        onChange={(e) => handleElementPropertyChange('fontSize', parseInt(e.target.value) || 0)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            )}

            {/* Position X Input */}
            <div className="space-y-1">
                <label htmlFor="posX" className="block text-sm font-medium text-gray-700">Position X (px)</label>
                <input
                    id="posX"
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => handleElementPropertyChange('x', parseInt(e.target.value) || 0)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            {/* Position Y Input */}
            <div className="space-y-1">
                <label htmlFor="posY" className="block text-sm font-medium text-gray-700">Position Y (px)</label>
                <input
                    id="posY"
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => handleElementPropertyChange('y', parseInt(e.target.value) || 0)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            
            {/* Box/Line properties */}
            {(selectedElement.type === 'line' || selectedElement.type === 'box') && (
                <div className="space-y-1">
                    <label htmlFor="elementColor" className="block text-sm font-medium text-gray-700">Element Color</label>
                    <input
                        id="elementColor"
                        type="color"
                        value={selectedElement.color || '#000000'}
                        onChange={(e) => handleElementPropertyChange('color', e.target.value)}
                        className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 text-sm cursor-pointer"
                    />
                </div>
            )}

            {/* Box/Line Size properties */}
            {(selectedElement.type === 'line' || selectedElement.type === 'box') && (
                <div className='flex gap-4'>
                    <div className="space-y-1 flex-1">
                        <label htmlFor="width" className="block text-sm font-medium text-gray-700">Width (px)</label>
                        <input id="width" type="number" value={selectedElement.width || 0}
                            onChange={(e) => handleElementPropertyChange('width', parseInt(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                        />
                    </div>
                    <div className="space-y-1 flex-1">
                        <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (px)</label>
                        <input id="height" type="number" value={selectedElement.height || 0}
                            onChange={(e) => handleElementPropertyChange('height', parseInt(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                        />
                    </div>
                </div>
            )}
            
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          Select an element in the preview to edit its properties.
        </div>
      )}
    </div>
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'design':
        return renderDesignTab();
      case 'properties':
        return renderPropertiesTab();
      case 'config':
      default:
        return renderConfigTab();
    }
  };
  
  // (Main Render JSX remains the same)
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Editor Controls */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Template Editor</h2>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { id: 'config', label: 'Layout', icon: AlignLeft }, 
            { id: 'design', label: 'Design', icon: Palette },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedElement(null) & setActiveTab(tab.id)} 
              className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
          {/* Properties Tab */}
          <button
              onClick={() => setActiveTab('properties')} 
              className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                activeTab === 'properties' || selectedElement
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Type className="h-4 w-4" />
              Properties
            </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>

      {/* Right Panel - PDF Preview */}
      <div className="flex-1 flex flex-col items-center p-8 overflow-auto">
        <div className="relative mt-8"> 
          {/* PDF Page Container (A4 outer boundary) */}
          <div
            className="shadow-2xl relative"
            style={{
              width: `${pdfWidth * scale}px`,
              height: `${pdfHeight * scale}px`,
              transform: 'translateZ(0)',
              backgroundColor: theme.pageBackgroundColor,
            }}
          >
            {/* Inner Content Container (where absolute coordinates are relative to) */}
            <div 
              className="absolute"
              style={{
                top: `${pageMarginTop * scale}px`,
                left: `${pageMarginLeft * scale}px`,
                width: `${contentWidth * scale}px`,
                height: `${(pdfHeight - pageMarginTop - pageMarginBottom) * scale}px`,
              }}
            >
              {pageElements.map((element) => {
                const renderElement = selectedElement && selectedElement.id === element.id ? selectedElement : element;
                
                if (renderElement.type === 'line') {
                    // Render a Line element
                    return (
                        <div
                            key={renderElement.id}
                            onClick={() => setSelectedElement(renderElement)}
                            className={`absolute cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
                                selectedElement?.id === renderElement.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            style={{
                                left: `${renderElement.x * scale}px`, 
                                top: `${renderElement.y * scale}px`, 
                                width: `${(renderElement.width || 400) * scale}px`,
                                height: `${(renderElement.height || 1) * scale}px`,
                                backgroundColor: renderElement.color || '#000000',
                            }}
                        />
                    );
                }

                if (renderElement.type === 'box') {
                    // Render a Box element (used for the Attendees background)
                    return (
                        <div
                            key={renderElement.id}
                            onClick={() => setSelectedElement(renderElement)}
                            className={`absolute cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
                                selectedElement?.id === renderElement.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            style={{
                                left: `${renderElement.x * scale}px`, 
                                top: `${renderElement.y * scale}px`, 
                                width: `${(renderElement.width || 100) * scale}px`,
                                height: `${(renderElement.height || 100) * scale}px`,
                                backgroundColor: renderElement.color || '#cccccc',
                                opacity: 0.5, // Make box semi-transparent for visibility
                            }}
                        />
                    );
                }
                
                // Render Text element
                return (
                  <div
                    key={renderElement.id}
                    className={`absolute cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
                      selectedElement?.id === renderElement.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: `${renderElement.x * scale}px`, 
                      top: `${renderElement.y * scale}px`,  
                      fontSize: `${renderElement.fontSize * scale}px`,
                      fontWeight: renderElement.fontWeight,
                      color: renderElement.color,
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setSelectedElement(renderElement)}
                  >
                    {renderElement.content}
                  </div>
                );
              })}
            </div>

            {/* Grid overlay for alignment (optional) */}
            <div
              className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-10 transition-opacity"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                `,
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
              }}
            />
          </div>

          {/* Page Info */}
          <div className="mt-4 text-center">
            <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
              A4 Page (210 × 297mm) - Scale: {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}