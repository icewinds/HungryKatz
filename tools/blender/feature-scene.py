"""HungryKatz: a needle-felted 3D Mango in a cosy café corner, rendered with Blender for store art.

Run (headless):  blender -b --factory-startup --python tools/blender/feature-scene.py -- <out.png> [width height samples]
Everything is built from primitives in code, so it can be tweaked and re-rendered at any time.
The felt look: matte colour + sheen + a fine fibre bump; no fur simulation, so it renders quickly.
"""
import math
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '//feature-render.png'
W, H = (int(args[1]), int(args[2])) if len(args) > 2 else (1024, 500)
SAMPLES = int(args[3]) if len(args) > 3 else 96

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def hex_rgb(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


def set_input(node, names, value):
    """Principled BSDF input names move between Blender versions: try each name until one exists."""
    for n in names if isinstance(names, (list, tuple)) else [names]:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


MATS = {}


def felt(name, color, sheen=0.9, rough=0.95, fuzz=0.6):
    """A needle-felt material: matte, soft sheen at the edges, and tiny fibres in the bump."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    set_input(bsdf, 'Base Color', hex_rgb(color))
    set_input(bsdf, 'Roughness', rough)
    set_input(bsdf, ['Sheen Weight', 'Sheen'], sheen)
    set_input(bsdf, ['Sheen Roughness'], 0.6)
    set_input(bsdf, ['Subsurface Weight', 'Subsurface'], 0.08)
    noise = nt.nodes.new('ShaderNodeTexNoise')
    set_input(noise, 'Scale', 120.0)
    set_input(noise, 'Detail', 10.0)
    set_input(noise, 'Roughness', 0.7)
    bump = nt.nodes.new('ShaderNodeBump')
    set_input(bump, 'Strength', fuzz)
    set_input(bump, 'Distance', 0.035)
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    MATS[name] = m
    return m


def glossy(name, color, rough=0.12):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    set_input(bsdf, 'Base Color', hex_rgb(color))
    set_input(bsdf, 'Roughness', rough)
    set_input(bsdf, ['Coat Weight', 'Clearcoat'], 0.6)
    return m


def emit(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = hex_rgb(color)
    e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    return m


def smooth(obj, level=2):
    for p in obj.data.polygons:
        p.use_smooth = True
    if level:
        mod = obj.modifiers.new('subd', 'SUBSURF')
        mod.levels = level
        mod.render_levels = level
    return obj


def blob(loc, r, scale=(1, 1, 1), mat=None, rot=(0, 0, 0), sub=1):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=16)
    o = bpy.context.active_object
    o.scale = scale
    o.rotation_euler = [math.radians(a) for a in rot]
    if mat:
        o.data.materials.append(mat)
    return smooth(o, sub)


def cyl(loc, r, depth, mat, rot=(0, 0, 0), verts=48, sub=0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=verts)
    o = bpy.context.active_object
    o.rotation_euler = [math.radians(a) for a in rot]
    o.data.materials.append(mat)
    bev = o.modifiers.new('bevel', 'BEVEL')
    bev.width = min(r, depth) * 0.25
    bev.segments = 4
    return smooth(o, sub)


def cone(loc, r1, depth, mat, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=0.0, depth=depth, location=loc, vertices=32)
    o = bpy.context.active_object
    o.rotation_euler = [math.radians(a) for a in rot]
    o.scale = scale
    o.data.materials.append(mat)
    return smooth(o, 2)  # subdivision rounds the tip: soft felt ears


# ------------------------------------------------------------------ palette (the game's colours)
GINGER, GINGER_D, CREAM = '#ee8a3c', '#c8692a', '#fff1dc'
PINK, BLUSH, INK = '#ffb3c6', '#ff8fab', '#2a1c22'
COCOA, BOW, GOLD = '#3b2f36', '#e8504f', '#ffd68a'

fur = felt('fur', GINGER)
fur_d = felt('fur_dark', GINGER_D)
cream = felt('cream', CREAM)
pink = felt('ear_pink', PINK)
blush = felt('blush', BLUSH, sheen=0.6)
apron = felt('apron', COCOA, sheen=0.7)
bow = felt('bow', BOW)
gold = felt('gold', GOLD, sheen=0.4)
eye = glossy('eye', INK, 0.08)
shine = emit('shine', '#ffffff', 6.0)

# ------------------------------------------------------------------ Mango (feet at MX, MY, 0; facing the camera)
MX, MY = 1.7, 0.15


def at(x, y, z):
    return (MX + x, MY + y, z)


# body, a little bean, and the cream chest
blob(at(0, 0, 0.58), 0.5, (1.0, 0.86, 0.92), fur)
# felt apron with a pocket and a little paw print, white collar points and a red bow tie
blob(at(0, -0.37, 0.56), 0.36, (0.95, 0.3, 1.1), apron)
blob(at(0.04, -0.47, 0.42), 0.12, (1.1, 0.25, 0.75), felt('pocket', '#4a3b43'))
for dx, dz, rr in [(0.08, 0.4, 0.035), (0.04, 0.45, 0.018), (0.08, 0.465, 0.018), (0.12, 0.45, 0.018)]:
    blob(at(dx, -0.5, dz), rr, (1, 0.5, 1), gold, sub=0)
for side in (-1, 1):
    cone(at(side * 0.14, -0.44, 0.93), 0.11, 0.2, cream, rot=(75, side * 55, 0), scale=(1, 0.45, 1))
    cone(at(side * 0.09, -0.48, 0.99), 0.07, 0.15, bow, rot=(0, side * -90, 0), scale=(1, 0.75, 1))
blob(at(0, -0.5, 0.99), 0.045, (1, 0.8, 1), bow)

# stubby legs tucked under, round mitten paws
for side in (-1, 1):
    cyl(at(side * 0.2, -0.05, 0.13), 0.12, 0.26, fur)
    blob(at(side * 0.2, -0.16, 0.07), 0.14, (1.0, 1.25, 0.6), fur)
# little arm nubs
for side in (-1, 1):
    blob(at(side * 0.46, -0.08, 0.62), 0.13, (0.75, 0.8, 1.15), fur, rot=(0, side * 25, 0))

# plume tail: overlapping puffs getting fuller toward the tip
tail = bpy.data.curves.new('tail', 'CURVE')
tail.dimensions = '3D'
tail.bevel_depth = 1.0
tail.bevel_resolution = 8
tail.use_fill_caps = True
spline = tail.splines.new('BEZIER')
pts = [(-0.36, 0.3, 0.32, 0.13), (-0.66, 0.42, 0.68, 0.17), (-0.72, 0.44, 1.12, 0.21), (-0.56, 0.38, 1.46, 0.2)]
spline.bezier_points.add(len(pts) - 1)
for bp, (x, y, z, r) in zip(spline.bezier_points, pts):
    bp.co = at(x, y, z)
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
    bp.radius = r
tail_obj = bpy.data.objects.new('tail', tail)
bpy.context.collection.objects.link(tail_obj)
tail_obj.data.materials.append(fur)
blob(at(-0.56, 0.38, 1.5), 0.2, mat=fur)  # round, fluffy tip

# big round head
HZ = 1.45
blob(at(0, 0, HZ), 0.62, (1.08, 0.95, 0.94), fur)
for dx, h in [(-0.13, 0.17), (0, 0.21), (0.13, 0.17)]:  # tabby stripes on the forehead
    blob(at(dx, -0.43, HZ + 0.36), 0.05, (0.55, 0.4, h / 0.05 * 0.5), fur_d)
blob(at(0, -0.5, HZ - 0.16), 0.2, (1.35, 0.6, 0.85), cream)  # soft muzzle
for side in (-1, 1):  # rounded felt ears with pink insides
    cone(at(side * 0.4, 0.02, HZ + 0.55), 0.3, 0.52, fur, rot=(0, side * 24, 0), scale=(1, 0.55, 1))
    cone(at(side * 0.39, -0.08, HZ + 0.52), 0.18, 0.34, pink, rot=(0, side * 24, 0), scale=(1, 0.35, 1))
for side in (-1, 1):  # big glossy eyes with a big and a little highlight, and rosy cheeks
    blob(at(side * 0.25, -0.5, HZ + 0.04), 0.13, (0.92, 0.55, 1.08), eye)
    blob(at(side * 0.25 - 0.045, -0.58, HZ + 0.1), 0.035, (1, 0.6, 1), shine, sub=0)
    blob(at(side * 0.25 + 0.04, -0.58, HZ - 0.01), 0.016, (1, 0.6, 1), shine, sub=0)
    blob(at(side * 0.43, -0.42, HZ - 0.13), 0.1, (1.2, 0.4, 0.75), blush)
blob(at(0, -0.6, HZ - 0.09), 0.045, (1.25, 0.8, 0.85), felt('nose', BLUSH, sheen=0.3))  # tiny pink nose
mouth = bpy.data.curves.new('mouth', 'CURVE')
mouth.dimensions = '3D'
mouth.bevel_depth = 0.009
mouth.bevel_resolution = 3
w = mouth.splines.new('BEZIER')
wpts = [(-0.075, HZ - 0.15), (-0.037, HZ - 0.185), (0, HZ - 0.15), (0.037, HZ - 0.185), (0.075, HZ - 0.15)]
w.bezier_points.add(len(wpts) - 1)
for bp, (x, z) in zip(w.bezier_points, wpts):
    bp.co = at(x, -0.615, z)
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
mouth_obj = bpy.data.objects.new('mouth', mouth)
bpy.context.collection.objects.link(mouth_obj)
mouth_obj.data.materials.append(felt('mouth', '#7a2e45', sheen=0.2, fuzz=0.1))

# ------------------------------------------------------------------ props: a tablecloth table with a cupcake and milk
TX, TY = 3.05, 0.95
cloth = felt('cloth', '#fffaf1', sheen=0.5, fuzz=0.12)
cyl((TX, TY, 0.42), 0.68, 0.84, cloth)
cyl((TX, TY, 0.86), 0.72, 0.06, felt('cloth_top', '#ffffff', sheen=0.4, fuzz=0.08))
cyl((TX - 0.22, TY - 0.15, 0.97), 0.12, 0.18, felt('wrapper', '#ff8fab'))
blob((TX - 0.22, TY - 0.15, 1.1), 0.14, (1, 1, 0.75), felt('frosting', '#fff3f6', sheen=0.5))
blob((TX - 0.22, TY - 0.15, 1.22), 0.04, mat=felt('cherry', '#e8504f', sheen=0.3))
cyl((TX + 0.25, TY - 0.05, 1.05), 0.1, 0.34, felt('milk', '#ffffff', sheen=0.3))
cyl((TX + 0.25, TY - 0.05, 1.24), 0.07, 0.05, felt('cap', '#5aa9e6'))

# ------------------------------------------------------------------ the café corner: floor, two walls, a window
floor = felt('floor', '#e8c9a2', sheen=0.1, rough=0.6, fuzz=0.05)
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 4, 0))
bpy.context.active_object.data.materials.append(floor)
wall = felt('wall', '#fbefdf', sheen=0.05, rough=0.9, fuzz=0.03)
wainscot = felt('wainscot', '#f3dcc0', sheen=0.05, rough=0.9, fuzz=0.03)
for x, rot in [(-1.5, 35), (3.9, -35)]:  # two walls meeting behind the scene, like the game's corner room
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 3.2, 2.5), rotation=(math.radians(90), 0, math.radians(rot)))
    w = bpy.context.active_object
    w.scale = (7, 5, 1)
    w.data.materials.append(wall)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 3.15, 0.45), rotation=(0, 0, math.radians(rot)))
    p = bpy.context.active_object
    p.scale = (7, 0.08, 0.9)
    p.data.materials.append(wainscot)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.0, 2.75, 2.1), rotation=(math.radians(90), 0, math.radians(35)))
win = bpy.context.active_object
win.scale = (1.6, 1.3, 1)
win.data.materials.append(emit('window', '#fff4dc', 3.0))


def light(kind, loc, energy, color, size=None, rot=(0, 0, 0)):
    bpy.ops.object.light_add(type=kind, location=loc, rotation=[math.radians(a) for a in rot])
    l = bpy.context.active_object
    l.data.energy = energy
    l.data.color = hex_rgb(color)[:3]
    if size is not None:
        l.data.size = size
    return l


light('AREA', (-3.5, -2.0, 4.0), 520, '#ffe8c8', 4.0, (55, 0, -55))   # warm window key light from the left
light('AREA', (5.5, -4.0, 2.5), 150, '#e8eeff', 5.0, (70, 0, 50))     # soft cool fill from the right
light('AREA', (1.5, 3.0, 4.5), 300, '#fff1dc', 3.0, (-40, 0, 180))    # rim light from behind for the felt fuzz

world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = hex_rgb('#fbefdf')
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.22

bpy.ops.object.camera_add(location=(0.9, -7.6, 2.3))
cam = bpy.context.active_object
cam.data.lens = 50
direction = Vector((0.9, 0.2, 1.05)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = (Vector(at(0, 0, 1.0)) - cam.location).length
cam.data.dof.aperture_fstop = 5.6

scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
try:
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Punchy'
except TypeError:
    pass
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('rendered', OUT)
