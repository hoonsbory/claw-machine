// 사진으로 만든 무거운 .glb(삼각형 수백만 개, 4K 텍스처)를 폰에서 돌릴 수 있게 줄인다.
// 사용: npm run shrink-glb -- <입력.glb> <출력.glb> [목표 삼각형 수=16000] [텍스처 한 변=1024]
// - 메시는 meshoptimizer 로 목표 삼각형 수까지 줄인다. 모양과 텍스처 이음매를 먼저 지키고, 목표까지 못 줄이면 조건을 풀어 가며 다시 줄인다.
// - 기본 색 텍스처와 노멀 맵은 긴 변 1024 픽셀(기본값) JPEG 로 줄여 남기고, 금속성·거칠기 맵은 버린다(천 인형이라 금속성 0, 거칠기 1 로 둔다).
// - 텍스처는 macOS 에 들어 있는 sips 로 줄이므로 macOS 에서만 돈다.
// - 메시 하나, 조각 하나에 위치·노멀·UV 가 따로 담긴 파일(사진으로 3D 를 만드는 도구가 내보내는 모양)만 다룬다.
// 처리하면서 입력과 결과의 삼각형 수, 결과 파일 크기를 보여 준다.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

const USAGE = '사용: npm run shrink-glb -- <입력.glb> <출력.glb> [목표 삼각형 수=16000] [텍스처 한 변=1024]';
const DEFAULT_TARGET_TRIANGLES = 16000;
const DEFAULT_TEXTURE_SIZE = 1024;

// glb 파일 구조(glTF 2.0 바이너리)
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_HEADER_LENGTH = 12;
const CHUNK_HEADER_LENGTH = 8;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const CHUNK_ALIGNMENT = 4;
const JSON_PADDING_BYTE = 0x20;
// glTF 숫자 코드: 자료형, 버퍼 용도, 텍스처 필터·반복
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const LINEAR = 9729;
const LINEAR_MIPMAP_LINEAR = 9987;
const REPEAT = 10497;
const MAX_SHORT_INDEX = 0xffff;
/** 메시 압축 확장. 이런 파일은 꼭짓점 자료가 압축돼 있어 이 도구로 읽지 못한다. */
const COMPRESSION_EXTENSIONS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression'];

const POSITION_SIZE = 3;
const NORMAL_SIZE = 3;
const UV_SIZE = 2;
const TRIANGLE_SIZE = 3;

// 줄이기 설정: 꼭짓점마다 노멀(3)과 UV(2)를 함께 지키고, UV 를 더 무겁게 봐서 텍스처 이음매가 덜 찢어지게 한다
const ATTRIBUTE_STRIDE = NORMAL_SIZE + UV_SIZE;
const NORMAL_WEIGHT = 0.5;
const UV_WEIGHT = 1;
const ATTRIBUTE_WEIGHTS = [NORMAL_WEIGHT, NORMAL_WEIGHT, NORMAL_WEIGHT, UV_WEIGHT, UV_WEIGHT];
/** 차례로 시도하는 오차 한도와 조건. 앞의 결과에서 이어서 줄인다. */
const SIMPLIFY_ATTEMPTS = [
  { error: 0.02, flags: ['Prune'] },
  { error: 0.1, flags: ['Prune'] },
  { error: 0.3, flags: ['Prune', 'Permissive'] },
  { error: 1, flags: ['Prune', 'Permissive'] },
];
/** 목표의 이 배수 안에 들어오면 더 줄이지 않는다 */
const CLOSE_ENOUGH_RATIO = 1.15;

const BASE_COLOR_JPEG_QUALITY = 86;
const NORMAL_MAP_JPEG_QUALITY = 92;
const BYTES_PER_KB = 1024;

main();

function main() {
  const [inputPath, outputPath, targetArg, textureArg] = process.argv.slice(2);
  if (inputPath === undefined || outputPath === undefined) exitWith(USAGE);
  if (process.platform !== 'darwin') exitWith('텍스처를 macOS 의 sips 로 줄이므로 macOS 에서만 돌릴 수 있다.');

  const targetTriangles = parsePositiveInteger(targetArg, DEFAULT_TARGET_TRIANGLES, '목표 삼각형 수');
  const textureSize = parsePositiveInteger(textureArg, DEFAULT_TEXTURE_SIZE, '텍스처 한 변');
  shrinkGlb({ inputPath, outputPath, targetTriangles, textureSize }).catch((error) => exitWith(`실패: ${error.message}`));
}

async function shrinkGlb({ inputPath, outputPath, targetTriangles, textureSize }) {
  await MeshoptSimplifier.ready;
  const glb = readGlb(inputPath);
  const { json } = glb;
  const compression = (json.extensionsUsed ?? []).find((name) => COMPRESSION_EXTENSIONS.includes(name));
  if (compression !== undefined) throw new Error(`압축된 모델(${compression})은 다루지 않는다. 압축을 끄고 다시 내보낸다`);
  const isSinglePrimitive = json.meshes?.length === 1 && json.meshes[0].primitives.length === 1;
  if (!isSinglePrimitive) throw new Error('메시 하나, 조각 하나짜리 모델만 다룬다');

  const primitive = json.meshes[0].primitives[0];
  const { POSITION, NORMAL, TEXCOORD_0 } = primitive.attributes;
  const hasAllAttributes = POSITION !== undefined && NORMAL !== undefined && TEXCOORD_0 !== undefined && primitive.indices !== undefined;
  if (!hasAllAttributes) throw new Error('위치·노멀·UV·인덱스가 모두 있는 모델만 다룬다');

  const positions = readAccessor(glb, POSITION, Float32Array, POSITION_SIZE);
  const normals = readAccessor(glb, NORMAL, Float32Array, NORMAL_SIZE);
  const uvs = readAccessor(glb, TEXCOORD_0, Float32Array, UV_SIZE);
  const indices = readIndices(glb, primitive.indices);
  console.log(`${inputPath}: 삼각형 ${indices.length / TRIANGLE_SIZE}, 꼭짓점 ${positions.length / POSITION_SIZE}`);

  const simplified = simplify({ indices, positions, normals, uvs, targetTriangles });
  const mesh = compact(simplified, positions, normals, uvs);
  console.log(`  결과: 삼각형 ${mesh.indices.length / TRIANGLE_SIZE}, 꼭짓점 ${mesh.count}`);

  // 재질이 없는 모델이면 텍스처 없이 기본 재질만 둔다
  const material = json.materials?.[primitive.material] ?? {};
  const images = shrinkTextures(glb, material, textureSize);
  const fileBytes = buildGlb(mesh, images, material, json);
  writeFileSync(outputPath, fileBytes);
  console.log(`  저장: ${outputPath} (${Math.floor(fileBytes.length / BYTES_PER_KB)} KB)`);
}

function parsePositiveInteger(text, fallback, label) {
  if (text === undefined) return fallback;

  const value = Number(text);
  if (!Number.isInteger(value) || value <= 0) exitWith(`${label}는 1 이상의 정수여야 한다: ${text}\n${USAGE}`);
  return value;
}

function exitWith(message) {
  console.error(message);
  process.exit(1);
}

// ── glb 읽기 ──

function readGlb(path) {
  const file = readFileSync(path);
  if (file.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${path} 는 glb 파일이 아니다`);

  const jsonStart = GLB_HEADER_LENGTH + CHUNK_HEADER_LENGTH;
  const jsonLength = file.readUInt32LE(GLB_HEADER_LENGTH);
  const json = JSON.parse(file.subarray(jsonStart, jsonStart + jsonLength).toString('utf8'));
  const binHeaderStart = jsonStart + jsonLength;
  const binStart = binHeaderStart + CHUNK_HEADER_LENGTH;
  const binLength = file.readUInt32LE(binHeaderStart);
  return { json, bin: file.subarray(binStart, binStart + binLength) };
}

function viewBytes({ json, bin }, viewIndex) {
  const view = json.bufferViews[viewIndex];
  const start = view.byteOffset ?? 0;
  return bin.subarray(start, start + view.byteLength);
}

function readAccessor(glb, accessorIndex, ArrayType, componentCount) {
  const accessor = glb.json.accessors[accessorIndex];
  const view = glb.json.bufferViews[accessor.bufferView];
  const isInterleaved = view.byteStride !== undefined && view.byteStride !== ArrayType.BYTES_PER_ELEMENT * componentCount;
  if (isInterleaved) throw new Error('여러 값을 섞어 담은(interleaved) 버퍼는 다루지 않는다');

  const start = glb.bin.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const byteLength = accessor.count * componentCount * ArrayType.BYTES_PER_ELEMENT;
  // 바이트 정렬이 어긋나 있을 수 있어 복사해서 읽는다
  return new ArrayType(glb.bin.buffer.slice(start, start + byteLength));
}

function readIndices(glb, accessorIndex) {
  const { componentType } = glb.json.accessors[accessorIndex];
  if (componentType === UNSIGNED_INT) return readAccessor(glb, accessorIndex, Uint32Array, 1);
  if (componentType === UNSIGNED_SHORT) return Uint32Array.from(readAccessor(glb, accessorIndex, Uint16Array, 1));
  throw new Error(`다루지 않는 인덱스 형식: ${componentType}`);
}

// ── 메시 줄이기 ──

function simplify({ indices, positions, normals, uvs, targetTriangles }) {
  const vertexCount = positions.length / POSITION_SIZE;
  const attributes = new Float32Array(vertexCount * ATTRIBUTE_STRIDE);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const offset = vertex * ATTRIBUTE_STRIDE;
    attributes.set(normals.subarray(vertex * NORMAL_SIZE, (vertex + 1) * NORMAL_SIZE), offset);
    attributes.set(uvs.subarray(vertex * UV_SIZE, (vertex + 1) * UV_SIZE), offset + NORMAL_SIZE);
  }

  const targetIndexCount = targetTriangles * TRIANGLE_SIZE;
  let best = indices;
  for (const attempt of SIMPLIFY_ATTEMPTS) {
    const [result, error] = MeshoptSimplifier.simplifyWithAttributes(
      best,
      positions,
      POSITION_SIZE,
      attributes,
      ATTRIBUTE_STRIDE,
      ATTRIBUTE_WEIGHTS,
      null,
      targetIndexCount,
      attempt.error,
      attempt.flags,
    );
    console.log(`  줄이기(오차 한도 ${attempt.error}, ${attempt.flags.join('+')}): 삼각형 ${result.length / TRIANGLE_SIZE}, 오차 ${error.toFixed(4)}`);
    best = result;
    if (best.length <= targetIndexCount * CLOSE_ENOUGH_RATIO) break;
  }
  return best;
}

/** 줄인 뒤 쓰지 않게 된 꼭짓점을 빼고 번호를 앞에서부터 다시 매긴다 */
function compact(indices, positions, normals, uvs) {
  const remap = new Map();
  const newIndices = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i += 1) {
    const oldIndex = indices[i];
    if (!remap.has(oldIndex)) remap.set(oldIndex, remap.size);
    newIndices[i] = remap.get(oldIndex);
  }

  const count = remap.size;
  const newPositions = new Float32Array(count * POSITION_SIZE);
  const newNormals = new Float32Array(count * NORMAL_SIZE);
  const newUvs = new Float32Array(count * UV_SIZE);
  for (const [oldIndex, newIndex] of remap) {
    newPositions.set(positions.subarray(oldIndex * POSITION_SIZE, (oldIndex + 1) * POSITION_SIZE), newIndex * POSITION_SIZE);
    newNormals.set(normals.subarray(oldIndex * NORMAL_SIZE, (oldIndex + 1) * NORMAL_SIZE), newIndex * NORMAL_SIZE);
    newUvs.set(uvs.subarray(oldIndex * UV_SIZE, (oldIndex + 1) * UV_SIZE), newIndex * UV_SIZE);
  }
  return { indices: newIndices, positions: newPositions, normals: newNormals, uvs: newUvs, count };
}

// ── 텍스처 줄이기 ──

/** 기본 색과 노멀 맵만 골라 JPEG 로 줄인다. 다른 텍스처(금속성·거칠기 등)는 버린다. */
function shrinkTextures(glb, material, textureSize) {
  const { json } = glb;
  const imageIndexOf = (textureInfo) => (textureInfo === undefined ? null : json.textures[textureInfo.index].source);
  const wanted = [
    { role: 'base', imageIndex: imageIndexOf(material.pbrMetallicRoughness?.baseColorTexture), quality: BASE_COLOR_JPEG_QUALITY },
    { role: 'normal', imageIndex: imageIndexOf(material.normalTexture), quality: NORMAL_MAP_JPEG_QUALITY },
  ];

  const workDir = mkdtempSync(join(tmpdir(), 'shrink-glb-'));
  try {
    return wanted
      .filter(({ imageIndex }) => imageIndex !== null)
      .map(({ role, imageIndex, quality }) => {
        const source = viewBytes(glb, json.images[imageIndex].bufferView);
        return { role, bytes: shrinkImage(source, { workDir, name: role, quality, textureSize }) };
      });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** 긴 변을 textureSize 로 줄인 JPEG. 원본 형식(PNG 등)은 sips 가 알아서 읽는다. */
function shrinkImage(bytes, { workDir, name, quality, textureSize }) {
  const source = join(workDir, `${name}.png`);
  const target = join(workDir, `${name}.jpg`);
  writeFileSync(source, bytes);
  const sipsArgs = ['-Z', String(textureSize), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), source, '--out', target];
  execFileSync('sips', sipsArgs, { stdio: 'ignore' });
  return readFileSync(target);
}

// ── 새 glb 만들기 ──

function buildGlb(mesh, images, material, sourceJson) {
  const binary = createBinaryBuilder();
  const useShortIndices = mesh.count <= MAX_SHORT_INDEX;
  const indexArray = useShortIndices ? Uint16Array.from(mesh.indices) : mesh.indices;
  const { min, max } = getBounds(mesh.positions);

  const accessors = [
    { bufferView: binary.add(mesh.positions, ARRAY_BUFFER), componentType: FLOAT, count: mesh.count, type: 'VEC3', min, max },
    { bufferView: binary.add(mesh.normals, ARRAY_BUFFER), componentType: FLOAT, count: mesh.count, type: 'VEC3' },
    { bufferView: binary.add(mesh.uvs, ARRAY_BUFFER), componentType: FLOAT, count: mesh.count, type: 'VEC2' },
    {
      bufferView: binary.add(indexArray, ELEMENT_ARRAY_BUFFER),
      componentType: useShortIndices ? UNSIGNED_SHORT : UNSIGNED_INT,
      count: mesh.indices.length,
      type: 'SCALAR',
    },
  ];
  const outImages = images.map((image) => ({ mimeType: 'image/jpeg', bufferView: binary.add(image.bytes) }));
  const textureIndexOf = (role) => images.findIndex((image) => image.role === role);

  const json = {
    asset: { version: '2.0', generator: 'shrink-glb' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'doll', mesh: 0, ...getRootTransform(sourceJson) }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [createPlushMaterial(material, textureIndexOf)],
    ...getTextureFields(outImages),
    accessors,
    bufferViews: binary.views,
    buffers: [{ byteLength: binary.byteLength() }],
  };
  return assembleGlb(json, binary.concat());
}

/** 남긴 텍스처가 있을 때만 textures·samplers·images 를 적는다 */
function getTextureFields(outImages) {
  if (outImages.length === 0) return {};

  return {
    textures: outImages.map((_, index) => ({ sampler: 0, source: index })),
    samplers: [{ magFilter: LINEAR, minFilter: LINEAR_MIPMAP_LINEAR, wrapS: REPEAT, wrapT: REPEAT }],
    images: outImages,
  };
}

/** 바이너리 덩어리에 자료를 4바이트 정렬로 이어 붙이고 bufferView 목록을 만든다 */
function createBinaryBuilder() {
  const parts = [];
  const views = [];
  let offset = 0;
  return {
    views,
    add(data, target) {
      const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      const padding = paddingFor(bytes.length);
      views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target === undefined ? {} : { target }) });
      parts.push(bytes, Buffer.alloc(padding));
      offset += bytes.length + padding;
      return views.length - 1;
    },
    byteLength: () => offset,
    concat: () => Buffer.concat(parts),
  };
}

function paddingFor(length) {
  return (CHUNK_ALIGNMENT - (length % CHUNK_ALIGNMENT)) % CHUNK_ALIGNMENT;
}

function getBounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 1) {
    const axis = i % POSITION_SIZE;
    min[axis] = Math.min(min[axis], positions[i]);
    max[axis] = Math.max(max[axis], positions[i]);
  }
  return { min, max };
}

/** 원본 첫 노드의 회전·크기·이동을 그대로 옮긴다. 생성 도구가 세워 두는 방향(위가 +Y)이 여기 들어 있다. */
function getRootTransform(sourceJson) {
  const node = sourceJson.nodes[sourceJson.scenes[sourceJson.scene ?? 0].nodes[0]];
  return {
    ...(node.rotation === undefined ? {} : { rotation: node.rotation }),
    ...(node.scale === undefined ? {} : { scale: node.scale }),
    ...(node.translation === undefined ? {} : { translation: node.translation }),
  };
}

/** 천 인형 재질: 기본 색과 노멀 맵만 쓰고 금속성 0, 거칠기 1 */
function createPlushMaterial(sourceMaterial, textureIndexOf) {
  const baseIndex = textureIndexOf('base');
  const normalIndex = textureIndexOf('normal');
  return {
    name: sourceMaterial.name ?? 'plush',
    pbrMetallicRoughness: {
      ...(baseIndex < 0 ? {} : { baseColorTexture: { index: baseIndex } }),
      metallicFactor: 0,
      roughnessFactor: 1,
    },
    ...(normalIndex < 0 ? {} : { normalTexture: { index: normalIndex } }),
  };
}

function assembleGlb(json, binBytes) {
  const rawJson = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonBytes = Buffer.concat([rawJson, Buffer.alloc(paddingFor(rawJson.length), JSON_PADDING_BYTE)]);
  const totalLength = GLB_HEADER_LENGTH + CHUNK_HEADER_LENGTH + jsonBytes.length + CHUNK_HEADER_LENGTH + binBytes.length;

  const header = Buffer.alloc(GLB_HEADER_LENGTH);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(GLB_VERSION, 4);
  header.writeUInt32LE(totalLength, 8);
  return Buffer.concat([header, chunkHeader(jsonBytes.length, CHUNK_JSON), jsonBytes, chunkHeader(binBytes.length, CHUNK_BIN), binBytes]);
}

function chunkHeader(length, type) {
  const bytes = Buffer.alloc(CHUNK_HEADER_LENGTH);
  bytes.writeUInt32LE(length, 0);
  bytes.writeUInt32LE(type, 4);
  return bytes;
}
