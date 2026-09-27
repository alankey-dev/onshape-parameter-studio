FeatureScript 2945;
import(path : "onshape/std/common.fs", version : "2945.0");

// GENERATED FILE. Edit enclosure.json and run generate_featurescript.py.

const ENCLOSURE_PARAMETER_META = [
    {
        "group" : "Fit",
        "name" : "clearance",
        "label" : "General clearance",
        "kind" : "Input",
        "description" : "General clearance between mating enclosure features."
    },
    {
        "group" : "Fit",
        "name" : "press_fit_clearance",
        "label" : "Press fit clearance",
        "kind" : "Input",
        "description" : "Clearance used for press fit features."
    },
    {
        "group" : "Fit",
        "name" : "cutout_clearance",
        "label" : "Cutout clearance",
        "kind" : "Input",
        "description" : "Default clearance added around external openings."
    },
    {
        "group" : "Enclosure",
        "name" : "wall",
        "label" : "Wall thickness",
        "kind" : "Input",
        "description" : "Main enclosure wall thickness."
    },
    {
        "group" : "Enclosure",
        "name" : "floor",
        "label" : "Floor thickness",
        "kind" : "Input",
        "description" : "Base or floor thickness."
    },
    {
        "group" : "Enclosure",
        "name" : "corner_radius",
        "label" : "Corner radius",
        "kind" : "Input",
        "description" : "Outside enclosure corner radius."
    },
    {
        "group" : "PCB",
        "name" : "pcb_width",
        "label" : "PCB width",
        "kind" : "Input",
        "description" : "Overall PCB width."
    },
    {
        "group" : "PCB",
        "name" : "pcb_height",
        "label" : "PCB height",
        "kind" : "Input",
        "description" : "Overall PCB height."
    },
    {
        "group" : "PCB",
        "name" : "pcb_thickness",
        "label" : "PCB thickness",
        "kind" : "Input",
        "description" : "PCB substrate thickness."
    },
    {
        "group" : "PCB",
        "name" : "pcb_clearance",
        "label" : "PCB clearance",
        "kind" : "Input",
        "description" : "Clearance around the PCB perimeter."
    },
    {
        "group" : "PCB",
        "name" : "pcb_notch_width",
        "label" : "PCB notch width",
        "kind" : "Input",
        "description" : "Width of the PCB locating or access notch."
    },
    {
        "group" : "PCB",
        "name" : "pcb_notch_height",
        "label" : "PCB notch height",
        "kind" : "Input",
        "description" : "Height of the PCB locating or access notch."
    },
    {
        "group" : "Display",
        "name" : "display_width",
        "label" : "Display width",
        "kind" : "Input",
        "description" : "Overall physical display module width."
    },
    {
        "group" : "Display",
        "name" : "display_height",
        "label" : "Display height",
        "kind" : "Input",
        "description" : "Overall physical display module height."
    },
    {
        "group" : "Display",
        "name" : "display_thickness",
        "label" : "Display thickness",
        "kind" : "Input",
        "description" : "Overall physical display module thickness."
    },
    {
        "group" : "Display",
        "name" : "display_view_width",
        "label" : "Visible display width",
        "kind" : "Input",
        "description" : "Width of the visible E-Ink area."
    },
    {
        "group" : "Display",
        "name" : "display_view_height",
        "label" : "Visible display height",
        "kind" : "Input",
        "description" : "Height of the visible E-Ink area."
    },
    {
        "group" : "Display",
        "name" : "display_overlap",
        "label" : "Display overlap",
        "kind" : "Input",
        "description" : "Amount of enclosure material overlapping the display edge."
    },
    {
        "group" : "Display",
        "name" : "display_cutout_width",
        "label" : "Display cutout width",
        "kind" : "Derived",
        "description" : "Calculated front opening width for the visible display."
    },
    {
        "group" : "Display",
        "name" : "display_cutout_height",
        "label" : "Display cutout height",
        "kind" : "Derived",
        "description" : "Calculated front opening height for the visible display."
    },
    {
        "group" : "Buttons",
        "name" : "button_diameter",
        "label" : "Button diameter",
        "kind" : "Input",
        "description" : "Physical button diameter."
    },
    {
        "group" : "Buttons",
        "name" : "button_height",
        "label" : "Button height",
        "kind" : "Input",
        "description" : "Physical button height."
    },
    {
        "group" : "Buttons",
        "name" : "button_spacing",
        "label" : "Button spacing",
        "kind" : "Input",
        "description" : "Centre to centre spacing between the two buttons."
    },
    {
        "group" : "Buttons",
        "name" : "button_clearance",
        "label" : "Button clearance",
        "kind" : "Input",
        "description" : "Radial clearance around a button opening."
    },
    {
        "group" : "Buttons",
        "name" : "button_cutout_diameter",
        "label" : "Button cutout diameter",
        "kind" : "Derived",
        "description" : "Calculated diameter of the enclosure button opening."
    },
    {
        "group" : "Speaker",
        "name" : "speaker_width",
        "label" : "Speaker width",
        "kind" : "Input",
        "description" : "Overall speaker width."
    },
    {
        "group" : "Speaker",
        "name" : "speaker_height",
        "label" : "Speaker height",
        "kind" : "Input",
        "description" : "Overall speaker height."
    },
    {
        "group" : "Speaker",
        "name" : "speaker_depth",
        "label" : "Speaker depth",
        "kind" : "Input",
        "description" : "Overall speaker depth."
    },
    {
        "group" : "Speaker",
        "name" : "speaker_clearance",
        "label" : "Speaker clearance",
        "kind" : "Input",
        "description" : "Clearance around the speaker opening or pocket."
    },
    {
        "group" : "Speaker",
        "name" : "speaker_cutout_width",
        "label" : "Speaker cutout width",
        "kind" : "Derived",
        "description" : "Calculated speaker opening width."
    },
    {
        "group" : "Speaker",
        "name" : "speaker_cutout_height",
        "label" : "Speaker cutout height",
        "kind" : "Derived",
        "description" : "Calculated speaker opening height."
    },
    {
        "group" : "SD Card",
        "name" : "sd_width",
        "label" : "SD slot width",
        "kind" : "Input",
        "description" : "Physical width used for the SD card or socket opening."
    },
    {
        "group" : "SD Card",
        "name" : "sd_height",
        "label" : "SD slot height",
        "kind" : "Input",
        "description" : "Physical height used for the SD card or socket opening."
    },
    {
        "group" : "SD Card",
        "name" : "sd_depth",
        "label" : "SD slot depth",
        "kind" : "Input",
        "description" : "Depth of the SD socket or required insertion envelope."
    },
    {
        "group" : "SD Card",
        "name" : "sd_clearance",
        "label" : "SD clearance",
        "kind" : "Input",
        "description" : "Clearance around the SD card opening."
    },
    {
        "group" : "SD Card",
        "name" : "sd_cutout_width",
        "label" : "SD cutout width",
        "kind" : "Derived",
        "description" : "Calculated SD card opening width."
    },
    {
        "group" : "SD Card",
        "name" : "sd_cutout_height",
        "label" : "SD cutout height",
        "kind" : "Derived",
        "description" : "Calculated SD card opening height."
    },
    {
        "group" : "USB C",
        "name" : "usb_width",
        "label" : "USB C width",
        "kind" : "Input",
        "description" : "Physical USB C connector width."
    },
    {
        "group" : "USB C",
        "name" : "usb_height",
        "label" : "USB C height",
        "kind" : "Input",
        "description" : "Physical USB C connector height."
    },
    {
        "group" : "USB C",
        "name" : "usb_depth",
        "label" : "USB C depth",
        "kind" : "Input",
        "description" : "Connector depth or internal access envelope."
    },
    {
        "group" : "USB C",
        "name" : "usb_clearance",
        "label" : "USB C clearance",
        "kind" : "Input",
        "description" : "Clearance around the USB C opening."
    },
    {
        "group" : "USB C",
        "name" : "usb_cutout_width",
        "label" : "USB C cutout width",
        "kind" : "Derived",
        "description" : "Calculated USB C enclosure opening width."
    },
    {
        "group" : "USB C",
        "name" : "usb_cutout_height",
        "label" : "USB C cutout height",
        "kind" : "Derived",
        "description" : "Calculated USB C enclosure opening height."
    },
    {
        "group" : "Case",
        "name" : "case_width",
        "label" : "Case width",
        "kind" : "Derived",
        "description" : "Calculated outside case width from the PCB envelope."
    },
    {
        "group" : "Case",
        "name" : "case_height",
        "label" : "Case height",
        "kind" : "Derived",
        "description" : "Calculated outside case height from the PCB envelope."
    },
    {
        "group" : "Case",
        "name" : "case_depth",
        "label" : "Case depth",
        "kind" : "Input",
        "description" : "Outside case depth. Kept as an input until the internal stack is defined."
    },
    {
        "group" : "Lid",
        "name" : "lid_depth",
        "label" : "Lid depth",
        "kind" : "Input",
        "description" : "Overall lid thickness or depth."
    },
    {
        "group" : "Lid",
        "name" : "lid_lip_depth",
        "label" : "Lid lip depth",
        "kind" : "Input",
        "description" : "Depth of the locating lip extending into the case."
    },
    {
        "group" : "Lid",
        "name" : "lid_lip_clearance",
        "label" : "Lid lip clearance",
        "kind" : "Derived",
        "description" : "Calculated lid lip clearance using the general enclosure clearance."
    },
    {
        "group" : "Fasteners",
        "name" : "screw_diameter",
        "label" : "Screw diameter",
        "kind" : "Input",
        "description" : "Nominal screw diameter."
    },
    {
        "group" : "Fasteners",
        "name" : "screw_boss_diameter",
        "label" : "Screw boss diameter",
        "kind" : "Input",
        "description" : "Outside diameter of a screw mounting boss."
    },
    {
        "group" : "Fasteners",
        "name" : "screw_boss_height",
        "label" : "Screw boss height",
        "kind" : "Input",
        "description" : "Height of a screw mounting boss."
    }
];

annotation {
    "Feature Type Name" : "Enclosure Parameters",
    "Feature Type Description" : "Defines the enclosure parameters and exposes them as Part Studio variables."
}
export const enclosureParameters = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        annotation { "Group Name" : "Fit", "Collapsed By Default" : false }
        {
            annotation { "Name" : "General clearance", "Description" : "General clearance between mating enclosure features." }
            isLength(definition.clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Press fit clearance", "Description" : "Clearance used for press fit features." }
            isLength(definition.press_fit_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Cutout clearance", "Description" : "Default clearance added around external openings." }
            isLength(definition.cutout_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Enclosure", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Wall thickness", "Description" : "Main enclosure wall thickness." }
            isLength(definition.wall, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Floor thickness", "Description" : "Base or floor thickness." }
            isLength(definition.floor, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Corner radius", "Description" : "Outside enclosure corner radius." }
            isLength(definition.corner_radius, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "PCB", "Collapsed By Default" : true }
        {
            annotation { "Name" : "PCB width", "Description" : "Overall PCB width." }
            isLength(definition.pcb_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "PCB height", "Description" : "Overall PCB height." }
            isLength(definition.pcb_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "PCB thickness", "Description" : "PCB substrate thickness." }
            isLength(definition.pcb_thickness, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "PCB clearance", "Description" : "Clearance around the PCB perimeter." }
            isLength(definition.pcb_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "PCB notch width", "Description" : "Width of the PCB locating or access notch." }
            isLength(definition.pcb_notch_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "PCB notch height", "Description" : "Height of the PCB locating or access notch." }
            isLength(definition.pcb_notch_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Display", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Display width", "Description" : "Overall physical display module width." }
            isLength(definition.display_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Display height", "Description" : "Overall physical display module height." }
            isLength(definition.display_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Display thickness", "Description" : "Overall physical display module thickness." }
            isLength(definition.display_thickness, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Visible display width", "Description" : "Width of the visible E-Ink area." }
            isLength(definition.display_view_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Visible display height", "Description" : "Height of the visible E-Ink area." }
            isLength(definition.display_view_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Display overlap", "Description" : "Amount of enclosure material overlapping the display edge." }
            isLength(definition.display_overlap, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Buttons", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Button diameter", "Description" : "Physical button diameter." }
            isLength(definition.button_diameter, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Button height", "Description" : "Physical button height." }
            isLength(definition.button_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Button spacing", "Description" : "Centre to centre spacing between the two buttons." }
            isLength(definition.button_spacing, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Button clearance", "Description" : "Radial clearance around a button opening." }
            isLength(definition.button_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Speaker", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Speaker width", "Description" : "Overall speaker width." }
            isLength(definition.speaker_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Speaker height", "Description" : "Overall speaker height." }
            isLength(definition.speaker_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Speaker depth", "Description" : "Overall speaker depth." }
            isLength(definition.speaker_depth, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Speaker clearance", "Description" : "Clearance around the speaker opening or pocket." }
            isLength(definition.speaker_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "SD Card", "Collapsed By Default" : true }
        {
            annotation { "Name" : "SD slot width", "Description" : "Physical width used for the SD card or socket opening." }
            isLength(definition.sd_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "SD slot height", "Description" : "Physical height used for the SD card or socket opening." }
            isLength(definition.sd_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "SD slot depth", "Description" : "Depth of the SD socket or required insertion envelope." }
            isLength(definition.sd_depth, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "SD clearance", "Description" : "Clearance around the SD card opening." }
            isLength(definition.sd_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "USB C", "Collapsed By Default" : true }
        {
            annotation { "Name" : "USB C width", "Description" : "Physical USB C connector width." }
            isLength(definition.usb_width, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "USB C height", "Description" : "Physical USB C connector height." }
            isLength(definition.usb_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "USB C depth", "Description" : "Connector depth or internal access envelope." }
            isLength(definition.usb_depth, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "USB C clearance", "Description" : "Clearance around the USB C opening." }
            isLength(definition.usb_clearance, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Case", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Case depth", "Description" : "Outside case depth. Kept as an input until the internal stack is defined." }
            isLength(definition.case_depth, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Lid", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Lid depth", "Description" : "Overall lid thickness or depth." }
            isLength(definition.lid_depth, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Lid lip depth", "Description" : "Depth of the locating lip extending into the case." }
            isLength(definition.lid_lip_depth, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }

        annotation { "Group Name" : "Fasteners", "Collapsed By Default" : true }
        {
            annotation { "Name" : "Screw diameter", "Description" : "Nominal screw diameter." }
            isLength(definition.screw_diameter, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Screw boss diameter", "Description" : "Outside diameter of a screw mounting boss." }
            isLength(definition.screw_boss_diameter, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);

            annotation { "Name" : "Screw boss height", "Description" : "Height of a screw mounting boss." }
            isLength(definition.screw_boss_height, { (millimeter) : [0, 0, 1000] } as LengthBoundSpec);
        }
    }
    {
        setVariable(context, "clearance", definition.clearance, "General clearance between mating enclosure features.");
        setVariable(context, "press_fit_clearance", definition.press_fit_clearance, "Clearance used for press fit features.");
        setVariable(context, "cutout_clearance", definition.cutout_clearance, "Default clearance added around external openings.");
        setVariable(context, "wall", definition.wall, "Main enclosure wall thickness.");
        setVariable(context, "floor", definition.floor, "Base or floor thickness.");
        setVariable(context, "corner_radius", definition.corner_radius, "Outside enclosure corner radius.");
        setVariable(context, "pcb_width", definition.pcb_width, "Overall PCB width.");
        setVariable(context, "pcb_height", definition.pcb_height, "Overall PCB height.");
        setVariable(context, "pcb_thickness", definition.pcb_thickness, "PCB substrate thickness.");
        setVariable(context, "pcb_clearance", definition.pcb_clearance, "Clearance around the PCB perimeter.");
        setVariable(context, "pcb_notch_width", definition.pcb_notch_width, "Width of the PCB locating or access notch.");
        setVariable(context, "pcb_notch_height", definition.pcb_notch_height, "Height of the PCB locating or access notch.");
        setVariable(context, "display_width", definition.display_width, "Overall physical display module width.");
        setVariable(context, "display_height", definition.display_height, "Overall physical display module height.");
        setVariable(context, "display_thickness", definition.display_thickness, "Overall physical display module thickness.");
        setVariable(context, "display_view_width", definition.display_view_width, "Width of the visible E-Ink area.");
        setVariable(context, "display_view_height", definition.display_view_height, "Height of the visible E-Ink area.");
        setVariable(context, "display_overlap", definition.display_overlap, "Amount of enclosure material overlapping the display edge.");
        const display_cutout_width = (definition.display_view_width + (definition.cutout_clearance * 2));
        setVariable(context, "display_cutout_width", display_cutout_width, "Calculated front opening width for the visible display.");
        const display_cutout_height = (definition.display_view_height + (definition.cutout_clearance * 2));
        setVariable(context, "display_cutout_height", display_cutout_height, "Calculated front opening height for the visible display.");
        setVariable(context, "button_diameter", definition.button_diameter, "Physical button diameter.");
        setVariable(context, "button_height", definition.button_height, "Physical button height.");
        setVariable(context, "button_spacing", definition.button_spacing, "Centre to centre spacing between the two buttons.");
        setVariable(context, "button_clearance", definition.button_clearance, "Radial clearance around a button opening.");
        const button_cutout_diameter = (definition.button_diameter + (definition.button_clearance * 2));
        setVariable(context, "button_cutout_diameter", button_cutout_diameter, "Calculated diameter of the enclosure button opening.");
        setVariable(context, "speaker_width", definition.speaker_width, "Overall speaker width.");
        setVariable(context, "speaker_height", definition.speaker_height, "Overall speaker height.");
        setVariable(context, "speaker_depth", definition.speaker_depth, "Overall speaker depth.");
        setVariable(context, "speaker_clearance", definition.speaker_clearance, "Clearance around the speaker opening or pocket.");
        const speaker_cutout_width = (definition.speaker_width + (definition.speaker_clearance * 2));
        setVariable(context, "speaker_cutout_width", speaker_cutout_width, "Calculated speaker opening width.");
        const speaker_cutout_height = (definition.speaker_height + (definition.speaker_clearance * 2));
        setVariable(context, "speaker_cutout_height", speaker_cutout_height, "Calculated speaker opening height.");
        setVariable(context, "sd_width", definition.sd_width, "Physical width used for the SD card or socket opening.");
        setVariable(context, "sd_height", definition.sd_height, "Physical height used for the SD card or socket opening.");
        setVariable(context, "sd_depth", definition.sd_depth, "Depth of the SD socket or required insertion envelope.");
        setVariable(context, "sd_clearance", definition.sd_clearance, "Clearance around the SD card opening.");
        const sd_cutout_width = (definition.sd_width + (definition.sd_clearance * 2));
        setVariable(context, "sd_cutout_width", sd_cutout_width, "Calculated SD card opening width.");
        const sd_cutout_height = (definition.sd_height + (definition.sd_clearance * 2));
        setVariable(context, "sd_cutout_height", sd_cutout_height, "Calculated SD card opening height.");
        setVariable(context, "usb_width", definition.usb_width, "Physical USB C connector width.");
        setVariable(context, "usb_height", definition.usb_height, "Physical USB C connector height.");
        setVariable(context, "usb_depth", definition.usb_depth, "Connector depth or internal access envelope.");
        setVariable(context, "usb_clearance", definition.usb_clearance, "Clearance around the USB C opening.");
        const usb_cutout_width = (definition.usb_width + (definition.usb_clearance * 2));
        setVariable(context, "usb_cutout_width", usb_cutout_width, "Calculated USB C enclosure opening width.");
        const usb_cutout_height = (definition.usb_height + (definition.usb_clearance * 2));
        setVariable(context, "usb_cutout_height", usb_cutout_height, "Calculated USB C enclosure opening height.");
        const case_width = ((definition.pcb_width + (definition.pcb_clearance * 2)) + (definition.wall * 2));
        setVariable(context, "case_width", case_width, "Calculated outside case width from the PCB envelope.");
        const case_height = ((definition.pcb_height + (definition.pcb_clearance * 2)) + (definition.wall * 2));
        setVariable(context, "case_height", case_height, "Calculated outside case height from the PCB envelope.");
        setVariable(context, "case_depth", definition.case_depth, "Outside case depth. Kept as an input until the internal stack is defined.");
        setVariable(context, "lid_depth", definition.lid_depth, "Overall lid thickness or depth.");
        setVariable(context, "lid_lip_depth", definition.lid_lip_depth, "Depth of the locating lip extending into the case.");
        const lid_lip_clearance = definition.clearance;
        setVariable(context, "lid_lip_clearance", lid_lip_clearance, "Calculated lid lip clearance using the general enclosure clearance.");
        setVariable(context, "screw_diameter", definition.screw_diameter, "Nominal screw diameter.");
        setVariable(context, "screw_boss_diameter", definition.screw_boss_diameter, "Outside diameter of a screw mounting boss.");
        setVariable(context, "screw_boss_height", definition.screw_boss_height, "Height of a screw mounting boss.");
    });

annotation { "Table Type Name" : "Enclosure Parameters" }
export const enclosureParameterTable = defineTable(function(context is Context, definition is map) returns Table
    precondition
    {
    }
    {
        const columns = [
            tableColumnDefinition("group", "Group"),
            tableColumnDefinition("variable", "Variable"),
            tableColumnDefinition("kind", "Kind"),
            tableColumnDefinition("value", "Value"),
            tableColumnDefinition("description", "Description")
        ];

        var rows = [];
        for (var item in ENCLOSURE_PARAMETER_META)
        {
            const value = getVariable(context, item.name, "Not set");
            rows = append(rows, tableRow({
                "group" : item.group,
                "variable" : "#" ~ item.name,
                "kind" : item.kind,
                "value" : value,
                "description" : item.description
            }));
        }

        return table("Enclosure Parameters", columns, rows);
    });
