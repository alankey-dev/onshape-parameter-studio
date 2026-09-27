FeatureScript 3083;
import(path : "onshape/std/common.fs", version : "3083.0");

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
        "description" : "Bare PCB substrate thickness (assembled stack with components is approximately 12mm)."
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
        "name" : "display_clearance",
        "label" : "Display clearance",
        "kind" : "Input",
        "description" : "Clearance around the display module footprint, used for case sizing."
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
        "group" : "Battery",
        "name" : "battery_width",
        "label" : "Battery width",
        "kind" : "Input",
        "description" : "Overall battery width."
    },
    {
        "group" : "Battery",
        "name" : "battery_height",
        "label" : "Battery height",
        "kind" : "Input",
        "description" : "Overall battery height."
    },
    {
        "group" : "Battery",
        "name" : "battery_thickness",
        "label" : "Battery thickness",
        "kind" : "Input",
        "description" : "Overall battery thickness."
    },
    {
        "group" : "Battery",
        "name" : "battery_clearance",
        "label" : "Battery clearance",
        "kind" : "Input",
        "description" : "Clearance around the battery footprint, used for case sizing."
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
        "description" : "Calculated outside case width from the largest internal component footprint."
    },
    {
        "group" : "Case",
        "name" : "case_height",
        "label" : "Case height",
        "kind" : "Derived",
        "description" : "Calculated outside case height from the largest internal component footprint."
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
    "Feature Type Description" : "Sets the enclosure parameters as Part Studio variables. Edit values in the parameter editor and regenerate rather than editing this feature's dialog."
}
export const enclosureParameters = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        setVariable(context, "clearance", 0.1 * millimeter, "General clearance between mating enclosure features.");
        setVariable(context, "press_fit_clearance", 0.1 * millimeter, "Clearance used for press fit features.");
        setVariable(context, "cutout_clearance", 0.2 * millimeter, "Default clearance added around external openings.");
        setVariable(context, "wall", 2 * millimeter, "Main enclosure wall thickness.");
        setVariable(context, "floor", 2 * millimeter, "Base or floor thickness.");
        setVariable(context, "corner_radius", 6 * millimeter, "Outside enclosure corner radius.");
        setVariable(context, "pcb_width", 34.2 * millimeter, "Overall PCB width.");
        setVariable(context, "pcb_height", 47.7 * millimeter, "Overall PCB height.");
        setVariable(context, "pcb_thickness", 1 * millimeter, "Bare PCB substrate thickness (assembled stack with components is approximately 12mm).");
        setVariable(context, "pcb_clearance", 0.2 * millimeter, "Clearance around the PCB perimeter.");
        setVariable(context, "pcb_notch_width", 22 * millimeter, "Width of the PCB locating or access notch.");
        setVariable(context, "pcb_notch_height", 5.7 * millimeter, "Height of the PCB locating or access notch.");
        setVariable(context, "display_width", 31.8 * millimeter, "Overall physical display module width.");
        setVariable(context, "display_height", 39 * millimeter, "Overall physical display module height.");
        setVariable(context, "display_thickness", 3.8 * millimeter, "Overall physical display module thickness.");
        setVariable(context, "display_view_width", 38 * millimeter, "Width of the visible E-Ink area.");
        setVariable(context, "display_view_height", 38 * millimeter, "Height of the visible E-Ink area.");
        setVariable(context, "display_overlap", 2 * millimeter, "Amount of enclosure material overlapping the display edge.");
        setVariable(context, "display_clearance", 0.2 * millimeter, "Clearance around the display module footprint, used for case sizing.");
        setVariable(context, "display_cutout_width", 38.4 * millimeter, "Calculated front opening width for the visible display.");
        setVariable(context, "display_cutout_height", 38.4 * millimeter, "Calculated front opening height for the visible display.");
        setVariable(context, "battery_width", 34.6 * millimeter, "Overall battery width.");
        setVariable(context, "battery_height", 50 * millimeter, "Overall battery height.");
        setVariable(context, "battery_thickness", 10 * millimeter, "Overall battery thickness.");
        setVariable(context, "battery_clearance", 0.2 * millimeter, "Clearance around the battery footprint, used for case sizing.");
        setVariable(context, "button_diameter", 2.1 * millimeter, "Physical button diameter.");
        setVariable(context, "button_height", 2 * millimeter, "Physical button height.");
        setVariable(context, "button_spacing", 10 * millimeter, "Centre to centre spacing between the two buttons.");
        setVariable(context, "button_clearance", 0.2 * millimeter, "Radial clearance around a button opening.");
        setVariable(context, "button_cutout_diameter", 2.5 * millimeter, "Calculated diameter of the enclosure button opening.");
        setVariable(context, "speaker_width", 15 * millimeter, "Overall speaker width.");
        setVariable(context, "speaker_height", 11 * millimeter, "Overall speaker height.");
        setVariable(context, "speaker_depth", 4.5 * millimeter, "Overall speaker depth.");
        setVariable(context, "speaker_clearance", 0.15 * millimeter, "Clearance around the speaker opening or pocket.");
        setVariable(context, "speaker_cutout_width", 15.3 * millimeter, "Calculated speaker opening width.");
        setVariable(context, "speaker_cutout_height", 11.3 * millimeter, "Calculated speaker opening height.");
        setVariable(context, "sd_width", 14 * millimeter, "Physical width used for the SD card or socket opening.");
        setVariable(context, "sd_height", 2 * millimeter, "Physical height used for the SD card or socket opening.");
        setVariable(context, "sd_depth", 14.5 * millimeter, "Depth of the SD socket or required insertion envelope.");
        setVariable(context, "sd_clearance", 0.1 * millimeter, "Clearance around the SD card opening.");
        setVariable(context, "sd_cutout_width", 14.2 * millimeter, "Calculated SD card opening width.");
        setVariable(context, "sd_cutout_height", 2.2 * millimeter, "Calculated SD card opening height.");
        setVariable(context, "usb_width", 9.5 * millimeter, "Physical USB C connector width.");
        setVariable(context, "usb_height", 3.7 * millimeter, "Physical USB C connector height.");
        setVariable(context, "usb_depth", 6 * millimeter, "Connector depth or internal access envelope.");
        setVariable(context, "usb_clearance", 0.1 * millimeter, "Clearance around the USB C opening.");
        setVariable(context, "usb_cutout_width", 9.7 * millimeter, "Calculated USB C enclosure opening width.");
        setVariable(context, "usb_cutout_height", 3.9000000000000004 * millimeter, "Calculated USB C enclosure opening height.");
        setVariable(context, "case_width", 39.0 * millimeter, "Calculated outside case width from the largest internal component footprint.");
        setVariable(context, "case_height", 54.4 * millimeter, "Calculated outside case height from the largest internal component footprint.");
        setVariable(context, "case_depth", 0 * millimeter, "Outside case depth. Kept as an input until the internal stack is defined.");
        setVariable(context, "lid_depth", 2.5 * millimeter, "Overall lid thickness or depth.");
        setVariable(context, "lid_lip_depth", 1 * millimeter, "Depth of the locating lip extending into the case.");
        setVariable(context, "lid_lip_clearance", 0.1 * millimeter, "Calculated lid lip clearance using the general enclosure clearance.");
        setVariable(context, "screw_diameter", 2 * millimeter, "Nominal screw diameter.");
        setVariable(context, "screw_boss_diameter", 4.3 * millimeter, "Outside diameter of a screw mounting boss.");
        setVariable(context, "screw_boss_height", 3.7 * millimeter, "Height of a screw mounting boss.");
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
